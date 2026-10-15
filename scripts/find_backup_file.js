const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function main() {
    const pool = await getPool();
    const query = "SELECT TOP 5 b.database_name, b.backup_start_date, m.physical_device_name FROM msdb.dbo.backupset b JOIN msdb.dbo.backupmediafamily m ON b.media_set_id = m.media_set_id WHERE b.database_name = 'AniDimensionDB' ORDER BY b.backup_start_date DESC";
    const res = await pool.request().query(query);
    console.log('Últimos backups registrados:');
    res.recordset.forEach(r => {
        console.log('-', r.backup_start_date, '|', r.physical_device_name, '| Existe:', fs.existsSync(r.physical_device_name));
        if (fs.existsSync(r.physical_device_name)) {
            const dest = path.join(__dirname, '..', 'backups', 'AniDimensionDB.bak');
            fs.copyFileSync(r.physical_device_name, dest);
            console.log('  ✅ Copiado a:', dest, 'Tamaño:', (fs.statSync(dest).size / (1024*1024)).toFixed(2), 'MB');
        }
    });
    process.exit(0);
}
main();
