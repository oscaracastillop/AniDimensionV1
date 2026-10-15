const { getPool } = require('../backend/config/db');

async function searchJsInDb() {
    try {
        const pool = await getPool();
        const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");
        for (const t of tables.recordset) {
            const cols = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${t.TABLE_NAME}' 
                  AND DATA_TYPE IN ('nvarchar', 'varchar', 'text', 'ntext')
            `);
            for (const c of cols.recordset) {
                try {
                    const q = `SELECT TOP 5 [${c.COLUMN_NAME}] as val FROM dbo.[${t.TABLE_NAME}] WHERE [${c.COLUMN_NAME}] LIKE '%.js%'`;
                    const res = await pool.request().query(q);
                    if (res.recordset.length > 0) {
                        console.log(`FOUND .js in Table: ${t.TABLE_NAME}, Column: ${c.COLUMN_NAME}`);
                        res.recordset.forEach(r => console.log('   Sample:', String(r.val).slice(0, 100)));
                    }
                } catch(e) {}
            }
        }
        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

searchJsInDb();
