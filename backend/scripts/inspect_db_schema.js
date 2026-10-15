const { getPool } = require('../config/db');

async function inspect() {
    const pool = await getPool();
    const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Card%' OR TABLE_NAME LIKE '%Deck%' OR TABLE_NAME LIKE '%NPC%'");
    console.log('Tables:', tables.recordset.map(t => t.TABLE_NAME));

    if (tables.recordset.some(t => t.TABLE_NAME === 'Cards' || t.TABLE_NAME === 'cards')) {
        const cCount = await pool.request().query("SELECT COUNT(*) as cnt FROM dbo.Cards");
        console.log('Cards count in dbo.Cards:', cCount.recordset[0].cnt);
        const fusions = await pool.request().query("SELECT TOP 5 CardId, Name, Type, Atk, Def FROM dbo.Cards WHERE Type LIKE '%Fusion%'");
        console.log('Sample fusions:', fusions.recordset);
    }
    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
