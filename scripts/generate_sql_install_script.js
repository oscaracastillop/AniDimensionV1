const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function generateUniversalSqlScript() {
    try {
        const pool = await getPool();
        const backupDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        console.log('📦 Generando Script SQL Universal Compatible con CUALQUIER versión de SQL Server...');

        let sqlScript = `-- ========================================================
-- SCRIPT DE INSTALACIÓN Y RESTAURACIÓN UNIVERSAL
-- BASE DE DATOS: AniDimensionDB
-- Compatible con SQL Server 2014, 2016, 2017, 2019, 2022
-- ========================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AniDimensionDB')
BEGIN
    CREATE DATABASE [AniDimensionDB];
END
GO

USE [AniDimensionDB];
GO
\n`;

        // 1. Obtener todas las tablas
        const tablesRes = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
        const tables = tablesRes.recordset.map(r => r.TABLE_NAME);

        // 2. Extraer datos y generar INSERTs masivos
        for (const tbl of tables) {
            console.log(`   ⏳ Procesando tabla: ${tbl}...`);
            const dataRes = await pool.request().query(`SELECT * FROM [dbo].[${tbl}]`);
            const rows = dataRes.recordset;

            if (rows.length === 0) continue;

            const cols = Object.keys(rows[0]);
            sqlScript += `\n-- Tabla: [${tbl}] (${rows.length} registros)\n`;
            
            // Si la tabla tiene IDENTITY, activarlo
            sqlScript += `IF OBJECT_ID('dbo.${tbl}', 'U') IS NOT NULL\nBEGIN\n`;
            sqlScript += `    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.${tbl}'))\n`;
            sqlScript += `        SET IDENTITY_INSERT [dbo].[${tbl}] ON;\n`;

            const batchSize = 100;
            for (let i = 0; i < rows.length; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                sqlScript += `    INSERT INTO [dbo].[${tbl}] ([${cols.join('], [')}]) VALUES\n`;
                
                const valLines = chunk.map(row => {
                    const vals = cols.map(c => {
                        const v = row[c];
                        if (v === null || v === undefined) return 'NULL';
                        if (typeof v === 'boolean') return v ? 1 : 0;
                        if (typeof v === 'number') return v;
                        if (v instanceof Date) return `'${v.toISOString()}'`;
                        return `N'${String(v).replace(/'/g, "''")}'`;
                    });
                    return `        (${vals.join(', ')})`;
                });
                
                sqlScript += valLines.join(',\n') + ';\n';
            }

            sqlScript += `    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.${tbl}'))\n`;
            sqlScript += `        SET IDENTITY_INSERT [dbo].[${tbl}] OFF;\n`;
            sqlScript += `END\nGO\n`;
        }

        // Guardar el script SQL
        const sqlPath = path.join(backupDir, 'AniDimensionDB_install.sql');
        fs.writeFileSync(sqlPath, sqlScript, 'utf8');
        const stats = fs.statSync(sqlPath);
        console.log('\n🎉 ✅ SCRIPT SQL UNIVERSAL GENERADO EXITOSAMENTE!');
        console.log('📂 Archivo:', sqlPath);
        console.log('📊 Peso:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');

        // Además, creamos un script Node automático para restaurar directamente en el VPS conectando por Node
        const importerScript = `const { getPool, sql } = require('../backend/config/db');
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
            console.log(\`📦 Restaurando tabla [\${tbl}] (\${rows.length} registros)...\`);

            const cols = Object.keys(rows[0]);
            
            // Truncar o limpiar tabla existente para evitar duplicados
            try {
                await pool.request().query(\`DELETE FROM [dbo].[\${tbl}]\`);
            } catch(e) {}

            let hasIdentity = false;
            try {
                const idenCheck = await pool.request().query(\`SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.\${tbl}')\`);
                hasIdentity = idenCheck.recordset.length > 0;
            } catch(e) {}

            const chunkSize = 100;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                let insertSql = '';
                if (hasIdentity) insertSql += \`SET IDENTITY_INSERT [dbo].[\${tbl}] ON; \`;
                insertSql += \`INSERT INTO [dbo].[\${tbl}] ([\${cols.join('], [')}]) VALUES \`;
                
                const valStrings = chunk.map(row => {
                    const vals = cols.map(c => {
                        const v = row[c];
                        if (v === null || v === undefined) return 'NULL';
                        if (typeof v === 'boolean') return v ? 1 : 0;
                        if (typeof v === 'number') return v;
                        if (typeof v === 'string' && v.match(/^\\d{4}-\\d{2}-\\d{2}T/)) return \`'\${v}'\`;
                        return \`N'\${String(v).replace(/'/g, "''")}'\`;
                    });
                    return \`(\${vals.join(', ')})\`;
                });

                insertSql += valStrings.join(', ') + '; ';
                if (hasIdentity) insertSql += \`SET IDENTITY_INSERT [dbo].[\${tbl}] OFF;\`;

                await pool.request().query(insertSql);
            }
            console.log(\`   ✅ [\${tbl}] restaurada exitosamente.\`);
        }

        console.log('\\n🎉 ¡BASE DE DATOS RESTAURADA COMPLETAMENTE AL 100% EN TU VPS!');
        process.exit(0);
    } catch(err) {
        console.error('❌ Error restaurando base de datos:', err.message);
        process.exit(1);
    }
}

importFullDatabase();
`;
        fs.writeFileSync(path.join(__dirname, 'restore_db_universal.js'), importerScript, 'utf8');
        console.log('✅ Script Node de restauración universal creado en: scripts/restore_db_universal.js');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

generateUniversalSqlScript();
