const { getPool } = require('../backend/config/db');

async function inspectEditar() {
    const pool = await getPool();
    const sp = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_EditarSubasta')) AS def");
    console.log(sp.recordset[0].def);
    await pool.close();
}

inspectEditar().catch(console.error);
