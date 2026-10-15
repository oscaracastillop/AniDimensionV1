const { getPool } = require('../backend/config/db');

async function main() {
    const pool = await getPool();
    const cols1 = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AvatarStats'");
    console.log('AvatarStats cols:\n', cols1.recordset);

    const user1Stats = await pool.request().query("SELECT * FROM dbo.AvatarStats WHERE UsuarioId = 1");
    console.log('\nUser 1 AvatarStats:\n', user1Stats.recordset);

    const user1 = await pool.request().query("SELECT Id, Username, Starships, Experiencia, Nivel, VipUntil FROM dbo.Usuarios WHERE Id = 1");
    console.log('\nUser 1:\n', user1.recordset);

    process.exit(0);
}
main().catch(console.error);
