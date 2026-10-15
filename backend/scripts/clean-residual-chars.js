const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');

function cleanCorruptions(str) {
    if (!str || typeof str !== 'string') return str;
    let s = str;
    // Replace bullet points
    s = s.replace(/\uFFFD\x14\uFFFD/g, '● ');
    s = s.replace(/\uFFFD\u0014\uFFFD/g, '● ');
    s = s.replace(/\uFFFD\s*\x14\s*\uFFFD/g, '● ');
    // Replace HÉROE
    s = s.replace(/H\uFFFD0ROE/g, 'HÉROE');
    s = s.replace(/h\uFFFD0roe/g, 'héroe');
    // Replace Éste/Ésta
    s = s.replace(/\uFFFD0ste/g, 'Éste');
    s = s.replace(/\uFFFD0sta/g, 'Ésta');
    s = s.replace(/\uFFFD0sto/g, 'Ésto');
    s = s.replace(/\uFFFD0/g, 'É');
    // Any remaining stray \uFFFD
    s = s.replace(/\uFFFD/g, '');
    return s;
}

async function fixCorruptions() {
    console.log('=== LIMPIANDO CARACTERES RESIDUALES EN TEXTOS ESPAÑOL ===');
    const pool = await getPool();

    const result = await pool.request().query('SELECT id, name_es, desc_es FROM texts');
    const all = result.recordset;

    const updates = [];
    for (const r of all) {
        const cleanName = cleanCorruptions(r.name_es);
        const cleanDesc = cleanCorruptions(r.desc_es);

        if (cleanName !== r.name_es || cleanDesc !== r.desc_es) {
            updates.push({
                id: r.id,
                name_es: cleanName,
                desc_es: cleanDesc
            });
        }
    }

    console.log(`Cartas con caracteres residuales a corregir: ${updates.length}`);

    const batchSize = 250;
    for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const req = pool.request();
        req.input('jsonPayload', sql.NVarChar(sql.MAX), JSON.stringify(batch));
        await req.query(`
            MERGE INTO texts AS Target
            USING (
                SELECT 
                    JSON_VALUE(item.value, '$.id') AS id,
                    JSON_VALUE(item.value, '$.name_es') AS name_es,
                    JSON_VALUE(item.value, '$.desc_es') AS desc_es
                FROM OPENJSON(@jsonPayload) AS item
            ) AS Source
            ON Target.id = Source.id
            WHEN MATCHED THEN
                UPDATE SET 
                    Target.name_es = Source.name_es,
                    Target.desc_es = Source.desc_es;
        `);
    }

    // Also update cards_index.json
    const filePath = path.resolve(__dirname, '../data/cards_index.json');
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        updates.forEach(u => {
            if (data[u.id]) {
                data[u.id].name_es = u.name_es;
                data[u.id].desc_es = u.desc_es;
            }
        });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('cards_index.json actualizado también.');
    }

    console.log('¡Limpieza de caracteres residuales completada!');
    process.exit(0);
}

fixCorruptions().catch(e => { console.error(e); process.exit(1); });
