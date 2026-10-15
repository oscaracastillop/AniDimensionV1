const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();
    const sp = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_CrearSubasta')) AS def");
    console.log('SP DEFINITION:\n', sp.recordset[0]?.def);

    const spFin = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_FinalizarSubasta')) AS def");
    console.log('\nSP FINALIZAR DEFINITION:\n', spFin.recordset[0]?.def);

    const spDeact = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_DeactivateAllEvents')) AS def");
    console.log('\nSP DEACTIVATE DEFINITION:\n', spDeact.recordset[0]?.def);

    const spPuja = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_RealizarPujaSubasta')) AS def");
    console.log('\nSP PUJA DEFINITION:\n', spPuja.recordset[0]?.def);

    const subastas = await pool.request().query(`
        SELECT TOP 10 Id, CardName, Status, StartsAt, EndsAt, 
               DATEDIFF(SECOND, GETDATE(), EndsAt) AS SecsLeft, 
               GETDATE() AS NowSql 
        FROM dbo.EventosSubasta 
        ORDER BY Id DESC
    `);
    console.log('\nULTIMAS SUBASTAS:\n', JSON.stringify(subastas.recordset, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
