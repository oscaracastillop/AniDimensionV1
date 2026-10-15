const { getPool, sql } = require('../config/db');

async function inspectSchema() {
    try {
        const pool = await getPool();
        const tables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        console.log('--- TABLAS EXISTENTES EN AniDimensionDB ---');
        tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME));
        process.exit(0);
    } catch (err) {
        console.error('Error inspeccionando schema:', err);
        process.exit(1);
    }
}

inspectSchema();
