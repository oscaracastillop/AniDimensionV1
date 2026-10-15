const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();

    const sp1 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ObtenerBuzonUsuario')) AS def");
    console.log('=== sp_ObtenerBuzonUsuario ===\n', sp1.recordset[0]?.def);

    const sp2 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ComprarPotenciador')) AS def");
    console.log('\n=== sp_ComprarPotenciador ===\n', sp2.recordset[0]?.def);

    const sp4 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ReclamarRegaloBuzon')) AS def");
    console.log('\n=== sp_ReclamarRegaloBuzon ===\n', sp4.recordset[0]?.def);

    const tables = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%Buzon%' OR TABLE_NAME LIKE '%Mailbox%'
    `);
    console.log('\n=== TABLAS DE BUZON ===\n', tables.recordset);

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
