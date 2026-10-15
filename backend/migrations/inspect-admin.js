const { getPool, sql } = require('../config/db');

async function inspectAdmin() {
    try {
        const pool = await getPool();
        const user = await pool.request().query("SELECT Id, Username, Email, Starships, IsAdmin FROM dbo.Usuarios WHERE LOWER(Username) = 'admin'");
        console.log('Usuario Admin:', user.recordset[0]);

        if (user.recordset.length > 0) {
            const uid = user.recordset[0].Id;
            const cards = await pool.request().input('Uid', sql.Int, uid).query('SELECT COUNT(*) as TotalCartas, SUM(Quantity) as TotalCopias FROM dbo.UserCardsSql WHERE UsuarioId = @Uid');
            console.log('Cartas en DB (dbo.UserCardsSql):', cards.recordset[0]);

            const deck = await pool.request().input('Uid', sql.Int, uid).query('SELECT Id, Nombre, MainDeckJson FROM dbo.Decks WHERE UsuarioId = @Uid AND EsActivo = 1');
            console.log('Mazo en DB (dbo.Decks):', deck.recordset[0]);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectAdmin();
