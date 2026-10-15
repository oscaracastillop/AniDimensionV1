const { getPool } = require('../config/db');

async function checkUserCards() {
    try {
        const pool = await getPool();
        const res = await pool.request().query('SELECT TOP 10 * FROM dbo.UserCards');
        console.log('UserCards rows:', res.recordset.length, res.recordset);
        const decks = await pool.request().query('SELECT TOP 5 * FROM dbo.Decks');
        console.log('Decks rows:', decks.recordset.length, decks.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUserCards();
