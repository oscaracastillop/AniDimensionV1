const { getPool } = require('../config/db');

async function inspectColumns() {
    try {
        const pool = await getPool();
        const tables = ['Usuarios', 'UserCards', 'Decks', 'UserAvatars', 'AvatarStats', 'UserMailbox', 'CardPacks', 'Cards'];
        for (const tbl of tables) {
            const cols = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${tbl}'
                ORDER BY ORDINAL_POSITION
            `);
            console.log(`\n=== TABLA: ${tbl} ===`);
            cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '('+c.CHARACTER_MAXIMUM_LENGTH+')' : ''}) ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectColumns();
