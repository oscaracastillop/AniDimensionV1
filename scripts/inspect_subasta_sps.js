const { getPool } = require('../backend/config/db');

async function inspectSubastaSps() {
    const pool = await getPool();
    const sp1 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_CrearSubasta')) AS def");
    console.log('=== sp_CrearSubasta ===\n', sp1.recordset[0].def);

    const sp2 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_FinalizarSubasta')) AS def");
    console.log('\n=== sp_FinalizarSubasta ===\n', sp2.recordset[0].def);

    const subs = await pool.request().query("SELECT TOP 5 * FROM dbo.EventosSubasta ORDER BY Id DESC");
    console.log('\n=== EventosSubasta ultimas 5 ===\n', subs.recordset);

    await pool.close();
}

inspectSubastaSps().catch(console.error);
