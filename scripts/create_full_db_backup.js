const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function exportFullBackupAndData() {
    try {
        const pool = await getPool();
        const backupDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const res = await pool.request().query("SELECT SERVERPROPERTY('InstanceDefaultDataPath') as data_path");
        const dataPath = res.recordset[0].data_path;
        const sourceBak = path.join(dataPath, 'AniDimensionDB.bak');
        const destBak = path.join(backupDir, 'AniDimensionDB.bak');

        // 1. Ejecutar Backup Nativo
        console.log('📦 1. Creando Backup Nativo SQL Server en:', sourceBak);
        await pool.request().query(`BACKUP DATABASE [AniDimensionDB] TO DISK = N'${sourceBak.replace(/'/g, "''")}' WITH FORMAT, INIT, NAME = N'AniDimensionDB-FullBackup', STATS = 10`);

        // 2. Copiar a la carpeta local del proyecto
        if (fs.existsSync(sourceBak)) {
            fs.copyFileSync(sourceBak, destBak);
            const stats = fs.statSync(destBak);
            console.log('✅ Archivo .BAK copiado con éxito a:', destBak);
            console.log('   📊 Tamaño .BAK:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
        }

        // 3. Exportar dump JSON completo de todas las tablas
        console.log('\n📦 2. Exportando volcado JSON estructurado de todas las tablas de la base de datos...');
        const tablesRes = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
        const tableList = tablesRes.recordset.map(r => r.TABLE_NAME);
        const fullDump = {};

        for (const tbl of tableList) {
            try {
                const r = await pool.request().query(`SELECT * FROM [dbo].[${tbl}]`);
                fullDump[tbl] = r.recordset;
                console.log(`   ✔️ [${tbl}]: ${r.recordset.length} registros exportados`);
            } catch (e) {
                console.warn(`   ⚠️ Error exportando ${tbl}:`, e.message);
            }
        }

        const jsonDumpPath = path.join(backupDir, 'AniDimensionDB_full_dump.json');
        fs.writeFileSync(jsonDumpPath, JSON.stringify(fullDump, null, 2), 'utf8');
        console.log('✅ Volcado JSON guardado en:', jsonDumpPath);

        console.log('\n🎉 ¡PROCESO DE BACKUP COMPLETADO AL 100%!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en el proceso:', err);
        process.exit(1);
    }
}

exportFullBackupAndData();
