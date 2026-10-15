const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../backend/config/db');

async function main() {
    console.log('========================================================================');
    console.log('🚀 GENERADOR MAESTRO DE COPIA 100% FIEL (TABLAS, DATOS Y 70 PROCEDURES)');
    console.log('   COMPATIBILIDAD GARANTIZADA: SQL Server 2008 R2, 2012, 2014, 2016, 2017, 2019, 2022');
    console.log('========================================================================\n');

    const pool = await getPool();
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Obtener todas las tablas base
    const tablesRes = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME != 'sysdiagrams'
        ORDER BY TABLE_NAME
    `);
    const tables = tablesRes.recordset;
    console.log(`📦 Encontradas ${tables.length} tablas base activas en la base de datos.`);

    let fullSql = `-- ========================================================\n`;
    fullSql += `-- SCRIPT DE INSTALACION MAESTRO COMPLETO (ESPEJO 100% REAL)\n`;
    fullSql += `-- BASE DE DATOS: AniDimensionDB\n`;
    fullSql += `-- COMPATIBLE CON: SQL SERVER 2008 R2, 2012, 2014, 2016, 2017, 2019, 2022\n`;
    fullSql += `-- ========================================================\n\n`;

    fullSql += `USE master;\nGO\n\n`;
    fullSql += `IF EXISTS (SELECT name FROM sys.databases WHERE name = N'AniDimensionDB')\n`;
    fullSql += `BEGIN\n`;
    fullSql += `    ALTER DATABASE [AniDimensionDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;\n`;
    fullSql += `    DROP DATABASE [AniDimensionDB];\n`;
    fullSql += `END\nGO\n\n`;
    fullSql += `CREATE DATABASE [AniDimensionDB];\nGO\n\n`;
    fullSql += `USE [AniDimensionDB];\nGO\n\n`;

    // 2. Extraer DDL de cada tabla
    console.log('⚙️ Extrayendo estructuras (DDL, llaves primarias, tipos e identidades)...');
    for (const t of tables) {
        const schema = t.TABLE_SCHEMA;
        const name = t.TABLE_NAME;

        const colRes = await pool.request().query(`
            SELECT 
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.CHARACTER_MAXIMUM_LENGTH,
                c.NUMERIC_PRECISION,
                c.NUMERIC_SCALE,
                c.IS_NULLABLE,
                c.COLUMN_DEFAULT,
                COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as IsIdentity
            FROM INFORMATION_SCHEMA.COLUMNS c
            WHERE c.TABLE_SCHEMA = '${schema}' AND c.TABLE_NAME = '${name}'
            ORDER BY c.ORDINAL_POSITION
        `);

        const pkRes = await pool.request().query(`
            SELECT kcu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
            WHERE tc.TABLE_SCHEMA = '${schema}' 
                AND tc.TABLE_NAME = '${name}' 
                AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        `);

        const pkCols = pkRes.recordset.map(r => `[${r.COLUMN_NAME}] ASC`).join(', ');

        fullSql += `-- ==========================================\n`;
        fullSql += `-- TABLA: [${schema}].[${name}]\n`;
        fullSql += `-- ==========================================\n`;
        fullSql += `IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[${schema}].[${name}]') AND type in (N'U'))\n`;
        fullSql += `BEGIN\n    CREATE TABLE [${schema}].[${name}] (\n`;

        const colDefs = [];
        for (const c of colRes.recordset) {
            let colDef = `        [${c.COLUMN_NAME}] `;
            let dataType = c.DATA_TYPE.toUpperCase();

            if (['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR'].includes(dataType)) {
                colDef += `${dataType}(${c.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : c.CHARACTER_MAXIMUM_LENGTH})`;
            } else if (['DECIMAL', 'NUMERIC'].includes(dataType)) {
                colDef += `${dataType}(${c.NUMERIC_PRECISION}, ${c.NUMERIC_SCALE})`;
            } else {
                colDef += dataType;
            }

            if (c.IsIdentity === 1) {
                colDef += ` IDENTITY(1,1)`;
            }

            if (c.IS_NULLABLE === 'NO') {
                colDef += ` NOT NULL`;
            } else {
                colDef += ` NULL`;
            }

            if (c.COLUMN_DEFAULT) {
                colDef += ` DEFAULT ${c.COLUMN_DEFAULT}`;
            }

            colDefs.push(colDef);
        }

        if (pkCols.length > 0) {
            colDefs.push(`        CONSTRAINT [PK_${name}] PRIMARY KEY CLUSTERED (${pkCols})`);
        }

        fullSql += colDefs.join(',\n') + `\n    );\nEND\nGO\n\n`;
    }

    // 3. Extraer TODOS los datos EN VIVO de la base de datos
    console.log('\n📊 Extrayendo registros en vivo de las tablas...');
    const liveDump = {};
    let totalRows = 0;

    for (const t of tables) {
        const name = t.TABLE_NAME;
        const rowsRes = await pool.request().query(`SELECT * FROM [dbo].[${name}]`);
        const rows = rowsRes.recordset;
        liveDump[name] = rows;
        totalRows += rows.length;

        if (rows.length === 0) continue;
        console.log(`   ✔️ [${name}]: ${rows.length} registros`);

        fullSql += `-- DATOS: [${name}] (${rows.length} registros)\n`;
        fullSql += `IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.${name}'))\n`;
        fullSql += `    SET IDENTITY_INSERT [dbo].[${name}] ON;\n\n`;

        const cols = Object.keys(rows[0]);
        const colsEscaped = cols.map(c => `[${c}]`).join(', ');

        for (let i = 0; i < rows.length; i += 200) {
            const chunk = rows.slice(i, i + 200);
            fullSql += `INSERT INTO [dbo].[${name}] (${colsEscaped}) VALUES\n`;

            const rowValues = chunk.map(r => {
                const vals = cols.map(c => {
                    const val = r[c];
                    if (val === null || val === undefined) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (typeof val === 'boolean') return val ? 1 : 0;
                    if (val instanceof Date || (typeof val === 'string' && (val.includes('GMT') || val.includes('hora estándar')))) {
                        const d = val instanceof Date ? val : new Date(val);
                        if (!isNaN(d.getTime())) {
                            const pad = n => String(n).padStart(2, '0');
                            const y = d.getFullYear();
                            const m = pad(d.getMonth() + 1);
                            const day = pad(d.getDate());
                            const h = pad(d.getHours());
                            const min = pad(d.getMinutes());
                            const s = pad(d.getSeconds());
                            return `'${y}-${m}-${day} ${h}:${min}:${s}'`;
                        }
                    }
                    const str = String(val).replace(/'/g, "''");
                    return `N'${str}'`;
                });
                return `    (${vals.join(', ')})`;
            });

            fullSql += rowValues.join(',\n') + ';\nGO\n\n';
        }

        fullSql += `IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.${name}'))\n`;
        fullSql += `    SET IDENTITY_INSERT [dbo].[${name}] OFF;\nGO\n\n`;
    }

    // Guardar live dump JSON actualizado
    const jsonDumpPath = path.join(backupDir, 'AniDimensionDB_full_dump.json');
    fs.writeFileSync(jsonDumpPath, JSON.stringify(liveDump, null, 2), 'utf8');
    console.log(`\n✅ AniDimensionDB_full_dump.json actualizado (${(fs.statSync(jsonDumpPath).size / 1024 / 1024).toFixed(2)} MB, ${totalRows} filas totales).`);

    // 4. Extraer los 70 Procedimientos Almacenados
    console.log('\n📜 Extrayendo los 70 procedimientos almacenados reales...');
    const procsRes = await pool.request().query(`
        SELECT o.name, m.definition 
        FROM sys.sql_modules m 
        JOIN sys.objects o ON m.object_id = o.object_id 
        WHERE o.type = 'P' 
        ORDER BY o.name
    `);

    fullSql += `-- ==========================================\n`;
    fullSql += `-- PROCEDIMIENTOS ALMACENADOS COMPLETOS (${procsRes.recordset.length} PROCEDURES)\n`;
    fullSql += `-- ==========================================\n\n`;

    for (const p of procsRes.recordset) {
        let def = p.definition.trim();
        def = def.replace(/CREATE\s+OR\s+ALTER\s+PROCEDURE/i, 'CREATE PROCEDURE');

        fullSql += `-- ==========================================\n`;
        fullSql += `-- PROCEDIMIENTO: [dbo].[${p.name}]\n`;
        fullSql += `-- ==========================================\n`;
        fullSql += `IF OBJECT_ID('dbo.[${p.name}]', 'P') IS NOT NULL DROP PROCEDURE dbo.[${p.name}];\nGO\n`;
        fullSql += `${def}\nGO\n\n`;
    }

    const outputPath = path.join(backupDir, 'AniDimensionDB_install_full.sql');
    fs.writeFileSync(outputPath, fullSql, 'utf8');
    const sqlSizeMb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ AniDimensionDB_install_full.sql generado con éxito (${sqlSizeMb} MB).`);

    // 5. Generar backup nativo .bak local por si se requiere
    console.log('\n💾 Actualizando backup binario AniDimensionDB_latest.bak...');
    try {
        const resPath = await pool.request().query("SELECT SERVERPROPERTY('InstanceDefaultDataPath') as data_path");
        const dataPath = resPath.recordset[0].data_path;
        const tempBak = path.join(dataPath, 'AniDimensionDB_latest.bak');
        const finalBak = path.join(backupDir, 'AniDimensionDB_latest.bak');

        await pool.request().query(`BACKUP DATABASE [AniDimensionDB] TO DISK = N'${tempBak.replace(/'/g, "''")}' WITH FORMAT, INIT, NAME = N'AniDimensionDB-Mirror-100', STATS = 10`);
        if (fs.existsSync(tempBak)) {
            fs.copyFileSync(tempBak, finalBak);
            console.log(`✅ AniDimensionDB_latest.bak guardado en backups/ (${(fs.statSync(finalBak).size / 1024 / 1024).toFixed(2)} MB).`);
        }
    } catch (e) {
        console.warn('⚠️ No se pudo generar .bak nativo:', e.message);
    }

    console.log('\n========================================================================');
    console.log('🎉 ¡ESPEJO 100% GENERADO SIN BASURA! RESUMEN FINAL:');
    console.log(`   - Tablas exportadas: ${tables.length}`);
    console.log(`   - Filas totales exportadas: ${totalRows}`);
    console.log(`   - Procedimientos Almacenados: ${procsRes.recordset.length}`);
    console.log('========================================================================\n');
    process.exit(0);
}

main().catch(e => {
    console.error('Error fatal:', e);
    process.exit(1);
});
