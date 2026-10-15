const { getPool, sql } = require('../config/db');

async function deleteUserSofia() {
    try {
        const pool = await getPool();
        console.log('🔍 Buscando al usuario "Sofia" en la base de datos...');

        const userFind = await pool.request()
            .query("SELECT Id, Username, Email FROM dbo.Usuarios WHERE LOWER(Username) = 'sofia' OR LOWER(Email) LIKE '%sofia%'");

        if (userFind.recordset.length === 0) {
            console.log('ℹ️ No se encontró ningún usuario con nombre o correo "Sofia" en dbo.Usuarios.');
            process.exit(0);
        }

        for (const user of userFind.recordset) {
            const uid = user.Id;
            console.log(`🗑️ Eliminando por completo al usuario: ${user.Username} (ID: ${uid}, Email: ${user.Email})...`);

            const tablesToDelete = [
                { table: 'dbo.UserCardsSql', col: 'UsuarioId' },
                { table: 'dbo.Decks', col: 'UsuarioId' },
                { table: 'dbo.UserAvatars', col: 'UserId' },
                { table: 'dbo.AvatarStats', col: 'UsuarioId' },
                { table: 'dbo.UserPlaymats', col: 'UsuarioId' },
                { table: 'dbo.UserSleeves', col: 'UsuarioId' },
                { table: 'dbo.UserVipPasses', col: 'UsuarioId' },
                { table: 'dbo.BuzonRecompensas', col: 'UsuarioId' },
                { table: 'dbo.HistorialDuelos', col: 'UsuarioId' },
                { table: 'dbo.UserMailbox', col: 'UsuarioId' }
            ];

            for (const item of tablesToDelete) {
                try {
                    await pool.request().input('Uid', sql.Int, uid).query(`DELETE FROM ${item.table} WHERE ${item.col} = @Uid`);
                    console.log(`  ✓ Limpiada tabla ${item.table}`);
                } catch (e) {
                    // Ignorar si la columna o tabla no aplica
                }
            }

            // Finalmente eliminar de dbo.Usuarios
            await pool.request().input('Uid', sql.Int, uid).query('DELETE FROM dbo.Usuarios WHERE Id = @Uid');
            console.log(`✅ Usuario ${user.Username} (ID: ${uid}) eliminado 100% de la base de datos.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error al eliminar usuario Sofia:', err);
        process.exit(1);
    }
}

deleteUserSofia();
