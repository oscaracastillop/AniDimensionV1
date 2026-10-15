const { getPool, sql } = require('../config/db');
const fs = require('fs');

async function seedAdminPackCards() {
    try {
        const pool = await getPool();

        // 1. Extraer las cartas únicas de los sobres configurados en packs-data.js
        const content = fs.readFileSync('./frontend/js/data/packs-data.js', 'utf8');
        const idMatches = content.match(/\"card_id\":\s*(\d+)/g) || [];
        const allCardIds = idMatches.map(m => parseInt(m.replace(/[^\d]/g, ''), 10));
        const packUniqueIds = Array.from(new Set(allCardIds));

        console.log(`[SEED] Encontradas ${packUniqueIds.length} cartas únicas en los sobres configurados de la gerencia.`);

        // 2. Limpiar inventario anterior de Admin (UserId = 1)
        await pool.request()
            .input('UserId', sql.Int, 1)
            .query('DELETE FROM dbo.UserCardsSql WHERE UsuarioId = @UserId');

        console.log('[SEED] Inventario residual del Admin eliminado completamente.');

        // 3. Insertar en lotes de 100 las cartas de los sobres para el Admin (3 copias de cada una)
        const batchSize = 100;
        for (let i = 0; i < packUniqueIds.length; i += batchSize) {
            const batch = packUniqueIds.slice(i, i + batchSize);
            const values = batch.map(id => `(1, ${id}, 3, 'NORMAL', GETDATE())`).join(',');
            await pool.request().query(`
                INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                VALUES ${values}
            `);
        }

        console.log(`✅ [SEED] Insertadas exitosamente ${packUniqueIds.length} cartas únicas (x3 copias = ${packUniqueIds.length * 3}) para el Admin.`);

        // 4. Asegurar que el Mazo Inicial del Admin esté activo y correcto
        const starterDeck = [
            32274490, 32274490, 32274490, 76103675, 80813021, 53293545, 89091579, 36121917, 36121917, 90357090,
            76184692, 32452818, 9159938, 1784619, 57305373, 75356564, 75356564, 75356564, 20060230, 44287299,
            85705804, 85705804, 85705804, 72842870, 53375573, 2863439, 17535588, 85639257, 33064647, 96851799,
            56283725, 80770678, 43500484, 16353197, 76211194, 73134081, 46130346, 63102017, 51482758, 50045299
        ];

        await pool.request()
            .input('UserId', sql.Int, 1)
            .input('MainJson', sql.NVarChar(sql.MAX), JSON.stringify(starterDeck))
            .query(`
                IF EXISTS (SELECT 1 FROM dbo.Decks WHERE UsuarioId = @UserId AND EsActivo = 1)
                BEGIN
                    UPDATE dbo.Decks 
                    SET MainDeckJson = @MainJson, ExtraDeckJson = '[]', SideDeckJson = '[]', Nombre = 'Mazo Inicial'
                    WHERE UsuarioId = @UserId AND EsActivo = 1;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.Decks (UsuarioId, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo, FechaCreacion)
                    VALUES (@UserId, 'Mazo Inicial', @MainJson, '[]', '[]', 1, GETDATE());
                END
            `);

        console.log('✅ [SEED] Mazo inicial de 40 cartas configurado para el Admin en dbo.Decks.');
        process.exit(0);
    } catch (err) {
        console.error('❌ [SEED ERROR]', err);
        process.exit(1);
    }
}

seedAdminPackCards();
