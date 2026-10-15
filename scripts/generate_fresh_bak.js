const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function main() {
    const pool = await getPool();
    const publicBak = 'C:\\Users\\Public\\AniDimensionDB_latest.bak';
    const destBak = path.join(__dirname, '..', 'backups', 'AniDimensionDB_latest.bak');

    console.log('📦 Generando Backup SQL Server fresco en:', publicBak);
    await pool.request().query(`BACKUP DATABASE [AniDimensionDB] TO DISK = N'${publicBak}' WITH FORMAT, INIT, NAME = N'AniDimensionDB-Live-Backup', STATS = 10`);

    if (fs.existsSync(publicBak)) {
        fs.copyFileSync(publicBak, destBak);
        const stats = fs.statSync(destBak);
        console.log('🎉 ✅ BACKUP COMPLETO GENERADO Y GUARDADO EN:');
        console.log('📂', destBak);
        console.log('📊 Peso:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
    }
    process.exit(0);
}
main();
