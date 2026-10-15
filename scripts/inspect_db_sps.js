const { getPool, sql } = require('../backend/config/db');

async function inspectDb() {
    try {
        const pool = await getPool();

        const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
        console.log(`=== TABLAS EN LA BASE DE DATOS (${tables.recordset.length}) ===`);
        console.log(tables.recordset.map(t => t.TABLE_NAME).join(', '));

        const sps = await pool.request().query("SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE' ORDER BY ROUTINE_NAME");
        console.log(`\n=== PROCEDIMIENTOS ALMACENADOS (${sps.recordset.length}) ===`);
        console.log(sps.recordset.map(s => s.ROUTINE_NAME).join('\n'));

        await pool.close();
    } catch (err) {
        console.error('Error inspeccionando DB:', err);
    }
}

inspectDb();
