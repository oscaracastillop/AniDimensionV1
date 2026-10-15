const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();
    const sp = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ObtenerDetallePerfilUsuario')) AS def");
    console.log('=== sp_ObtenerDetallePerfilUsuario ===\n', sp.recordset[0]?.def);
    process.exit(0);
}
main().catch(console.error);
