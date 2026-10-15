const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();
    const sp1 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ComprarYGuardarSobre')) AS def");
    console.log('=== sp_ComprarYGuardarSobre ===\n', sp1.recordset[0]?.def);

    const sp2 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.sp_ComprarAbrirSobre')) AS def");
    console.log('\n=== sp_ComprarAbrirSobre ===\n', sp2.recordset[0]?.def);

    const count1 = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.BuzonRecompensas");
    const count2 = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.UserMailbox");
    const count3 = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.BuzonRegalos");
    console.log('\nCounts: BuzonRecompensas:', count1.recordset[0].c, 'UserMailbox:', count2.recordset[0].c, 'BuzonRegalos:', count3.recordset[0].c);

    const recentRecompensas = await pool.request().query("SELECT TOP 5 * FROM dbo.BuzonRecompensas ORDER BY Id DESC");
    console.log('\nRecent BuzonRecompensas:\n', recentRecompensas.recordset);

    const recentMailbox = await pool.request().query("SELECT TOP 5 * FROM dbo.UserMailbox ORDER BY Id DESC");
    console.log('\nRecent UserMailbox:\n', recentMailbox.recordset);

    process.exit(0);
}
main().catch(console.error);
