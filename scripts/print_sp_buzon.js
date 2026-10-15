const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();
    const sp1 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ObtenerBuzonUsuario')) AS def");
    console.log('=== sp_ObtenerBuzonUsuario ===\n', sp1.recordset[0]?.def);
    const sp2 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ComprarPotenciador')) AS def");
    console.log('\n=== sp_ComprarPotenciador ===\n', sp2.recordset[0]?.def);
    process.exit(0);
}
main().catch(console.error);
