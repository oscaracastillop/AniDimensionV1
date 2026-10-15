const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');

function fixMojibake(str) {
    if (!str || typeof str !== 'string') return str;
    if (!str.includes('Ã')) return str;
    try {
        const decoded = Buffer.from(str, 'latin1').toString('utf8');
        // If decoded still has Ã, try once more or return
        if (decoded.includes('Ã') && !str.includes('Ã¡') && !str.includes('Ã©')) {
            return decoded;
        }
        return decoded;
    } catch (e) {
        return str;
    }
}

async function runFixCardTexts() {
    console.log('=== INICIANDO CORRECCIÓN DE TEXTOS Y TILDES (ESPAÑOL E INGLÉS) ===');
    const pool = await getPool();

    // 1. Cargar cards_index.json para texto en inglés oficial
    const cardsIndexPath = path.resolve(__dirname, '../data/cards_index.json');
    let englishMap = {};
    if (fs.existsSync(cardsIndexPath)) {
        console.log('[1/4] Leyendo cards_index.json para textos oficiales en inglés...');
        englishMap = JSON.parse(fs.readFileSync(cardsIndexPath, 'utf8'));
    }

    // 2. Consultar todas las filas de texts
    console.log('[2/4] Consultando cartas de la tabla texts en SQL Server...');
    const result = await pool.request().query('SELECT id, name, [desc], name_es, desc_es FROM texts');
    const allCards = result.recordset;
    console.log(`Total de cartas encontradas: ${allCards.length}`);

    // 3. Procesar en batches con tabla temporal o updates en batches de 500
    console.log('[3/4] Procesando corrección de tildes y nombres en inglés...');
    const batchSize = 250;
    let updatedCount = 0;

    for (let i = 0; i < allCards.length; i += batchSize) {
        const batch = allCards.slice(i, i + batchSize);
        const updates = [];

        for (const card of batch) {
            const eng = englishMap[card.id];
            let nameEng = card.name;
            let descEng = card.desc;
            if (eng) {
                if (eng.name) nameEng = eng.name;
                if (eng.desc) descEng = eng.desc;
            } else {
                nameEng = fixMojibake(nameEng);
                descEng = fixMojibake(descEng);
            }

            const nameEs = fixMojibake(card.name_es);
            const descEs = fixMojibake(card.desc_es);

            if (nameEng !== card.name || descEng !== card.desc || nameEs !== card.name_es || descEs !== card.desc_es) {
                updates.push({
                    id: card.id,
                    name: nameEng,
                    desc: descEng,
                    name_es: nameEs,
                    desc_es: descEs
                });
            }
        }

        if (updates.length > 0) {
            // Execute batch update using TVP or MERGE via JSON
            const req = pool.request();
            req.input('jsonPayload', sql.NVarChar(sql.MAX), JSON.stringify(updates));
            await req.query(`
                MERGE INTO texts AS Target
                USING (
                    SELECT 
                        JSON_VALUE(item.value, '$.id') AS id,
                        JSON_VALUE(item.value, '$.name') AS name,
                        JSON_VALUE(item.value, '$.desc') AS [desc],
                        JSON_VALUE(item.value, '$.name_es') AS name_es,
                        JSON_VALUE(item.value, '$.desc_es') AS desc_es
                    FROM OPENJSON(@jsonPayload) AS item
                ) AS Source
                ON Target.id = Source.id
                WHEN MATCHED THEN
                    UPDATE SET 
                        Target.name = Source.name,
                        Target.[desc] = Source.[desc],
                        Target.name_es = Source.name_es,
                        Target.desc_es = Source.desc_es;
            `);
            updatedCount += updates.length;
        }

        if ((i + batchSize) % 2500 === 0 || i + batchSize >= allCards.length) {
            console.log(`  Progreso: ${Math.min(i + batchSize, allCards.length)} / ${allCards.length} (${updatedCount} cartas corregidas hasta ahora)`);
        }
    }

    console.log(`[4/4] ¡CORRECCIÓN FINALIZADA! Total de cartas actualizadas: ${updatedCount}`);

    // Verificación
    const verifyEs = await pool.request().query('SELECT COUNT(*) as c FROM texts WHERE name_es LIKE \'%Ã%\' OR desc_es LIKE \'%Ã%\'');
    console.log(`Cartas restantes con mojibake (Ã): ${verifyEs.recordset[0].c}`);

    const sample = await pool.request().query('SELECT TOP 3 id, name, [desc], name_es, desc_es FROM texts WHERE name_es IS NOT NULL AND name_es <> \'\'');
    console.log('Muestra verificada:', sample.recordset);

    process.exit(0);
}

runFixCardTexts().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
