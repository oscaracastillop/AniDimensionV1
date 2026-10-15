const { getPool, sql } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function fixBoosterPacksEncoding() {
    try {
        console.log('[FIX ENCODING] Conectando a la base de datos...');
        const pool = await getPool();

        // Leer datos limpios desde build_packs_data.js
        const buildPacksPath = path.resolve(__dirname, '../backend/data/build_packs_data.js');
        const content = fs.readFileSync(buildPacksPath, 'utf8');

        // Extraer INITIAL_PACKS usando regex o ejecución segura
        const match = content.match(/const INITIAL_PACKS = (\[[\s\S]*?\]);\s*\/\/ \d+\./) || content.match(/const INITIAL_PACKS = (\[[\s\S]*?\]);/);
        
        let packs = [];
        if (match) {
            const sandbox = `
                const lobCards=[], mrdCards=[], mrlCards=[], psvCards=[], lonCards=[], lodCards=[], pgdCards=[], mfcCards=[], dcrCards=[], iocCards=[], astCards=[], promoDmCards=[], godsCards=[], drlgCards=[], tlmCards=[], crvCards=[], eenCards=[], soiCards=[], eojCards=[], potdCards=[], cdipCards=[], stonCards=[], fotbCards=[], taevCards=[], glasCards=[], ptdnCards=[], lodtCards=[], tdgsCards=[], csocCards=[], crmsCards=[], rgbtCards=[], anprCards=[], sovrCards=[], abpfCards=[], tshdCards=[], drevCards=[], stblCards=[], storCards=[], exvcCards=[];
                return ${match[1]};
            `;
            const fn = new Function(sandbox);
            packs = fn();
        }

        console.log(`[FIX ENCODING] Procesando ${packs.length} sobres con codificación UTF-8 pura...`);

        for (const p of packs) {
            let offer = p.offer_text || '';
            let name = p.name || '';
            let desc = p.description || '';

            await pool.request()
                .input('PackId', sql.NVarChar(50), p.id)
                .input('Name', sql.NVarChar(150), name)
                .input('OfferText', sql.NVarChar(100), offer)
                .input('Description', sql.NVarChar(1000), desc)
                .query(`
                    UPDATE dbo.BoosterPacks
                    SET 
                        Name = @Name,
                        OfferText = @OfferText,
                        Description = @Description,
                        UpdatedAt = GETDATE()
                    WHERE PackId = @PackId;
                `);
            console.log(` -> Sobre [${p.id}] actualizado: "${p.name}" | Offer: "${offer}"`);
        }

        // También verificar tabla Clans por si hay mojibake en el mensaje de bienvenida
        await pool.request().query(`
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Clans')
            BEGIN
                UPDATE dbo.Clans
                SET Notice = REPLACE(REPLACE(Notice, 'Â¡', '¡'), 'Â¿', '¿')
                WHERE Notice LIKE '%Â%';

                UPDATE dbo.Clans
                SET MensajeBienvenida = REPLACE(REPLACE(MensajeBienvenida, 'Â¡', '¡'), 'Â¿', '¿')
                WHERE MensajeBienvenida LIKE '%Â%';
            END
        `);
        console.log('[FIX ENCODING] Limpieza de Mojibake en Clans completada.');

        console.log('✅ Todos los sobres y textos han sido saneados con UTF-8 nativo en AniDimensionDB.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al arreglar codificación:', err);
        process.exit(1);
    }
}

fixBoosterPacksEncoding();
