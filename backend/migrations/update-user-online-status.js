const { getPool, sql } = require('../config/db');

async function main() {
    try {
        const pool = await getPool();
        const res = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Usuarios'");
        console.log('Columns in Usuarios:', res.recordset.map(c => c.COLUMN_NAME));

        const hasIsOnline = res.recordset.some(c => c.COLUMN_NAME.toLowerCase() === 'isonline');
        if (!hasIsOnline) {
            console.log('Adding IsOnline column to dbo.Usuarios...');
            await pool.request().query("ALTER TABLE dbo.Usuarios ADD IsOnline BIT NOT NULL DEFAULT 0");
            console.log('Column IsOnline added successfully.');
        } else {
            console.log('IsOnline column already exists in dbo.Usuarios.');
        }

        const users = await pool.request().query("SELECT Id, Username, IsOnline, ActiveSessionToken, LastLoginAt FROM dbo.Usuarios");
        console.log('Users in DB:', users.recordset);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
