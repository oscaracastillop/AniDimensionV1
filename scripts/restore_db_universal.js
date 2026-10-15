const { getPool, sql } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function importFullDatabase() {
    try {
        console.log('🚀 Iniciando Restauración Universal de Base de Datos AniDimensionDB en VPS...');
        const pool = await getPool();
        const dumpPath = path.join(__dirname, '..', 'backups', 'AniDimensionDB_full_dump.json');
        
        if (!fs.existsSync(dumpPath)) {
            console.error('❌ No se encontró el archivo AniDimensionDB_full_dump.json en backups/');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
        const tables = Object.keys(data);

        for (const tbl of tables) {
            const rows = data[tbl];
            if (!rows || rows.length === 0) continue;
            console.log(`📦 Restaurando tabla [${tbl}] (${rows.length} registros)...`);

            const cols = Object.keys(rows[0]);
            
            // Truncar o limpiar tabla existente para evitar duplicados
            try {
                await pool.request().query(`DELETE FROM [dbo].[${tbl}]`);
            } catch(e) {}

            let hasIdentity = false;
            try {
                const idenCheck = await pool.request().query(`SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.${tbl}')`);
                hasIdentity = idenCheck.recordset.length > 0;
            } catch(e) {}

            const chunkSize = 100;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                let insertSql = '';
                if (hasIdentity) insertSql += `SET IDENTITY_INSERT [dbo].[${tbl}] ON; `;
                insertSql += `INSERT INTO [dbo].[${tbl}] ([${cols.join('], [')}]) VALUES `;
                
                const valStrings = chunk.map(row => {
                    const vals = cols.map(c => {
                        const v = row[c];
                        if (v === null || v === undefined) return 'NULL';
                        if (typeof v === 'boolean') return v ? 1 : 0;
                        if (typeof v === 'number') return v;
                        if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) return `'${v}'`;
                        return `N'${String(v).replace(/'/g, "''")}'`;
                    });
                    return `(${vals.join(', ')})`;
                });

                insertSql += valStrings.join(', ') + '; ';
                if (hasIdentity) insertSql += `SET IDENTITY_INSERT [dbo].[${tbl}] OFF;`;

                await pool.request().query(insertSql);
            }
            console.log(`   ✅ [${tbl}] restaurada exitosamente.`);
        }

        console.log('\n🎉 ¡BASE DE DATOS RESTAURADA COMPLETAMENTE AL 100% EN TU VPS!');
        process.exit(0);
    } catch(err) {
        console.error('❌ Error restaurando base de datos:', err.message);
        process.exit(1);
    }
}

importFullDatabase();
