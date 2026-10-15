const { getPool } = require('../backend/config/db');
const fs = require('fs');
const path = require('path');

async function cleanNonAdminUsersStrict() {
    try {
        const pool = await getPool();
        console.log('🧹 1. Eliminando todas las dependencias con UserId / UsuarioId <> 1...');

        const tablesWithUserId = [
            "ClanMembers",
            "ClanJoinRequests",
            "UserMedals",
            "UserAdventureProgress",
            "UserNpcRecords",
            "UserAvatars",
            "StarshipTransactions",
            "HistorialDuelos",
            "Decks",
            "UserCardsSql",
            "UserPlaymats",
            "UserSleeves",
            "UserVipPasses",
            "AvatarStats",
            "UserMailbox",
            "BuzonRecompensas",
            "BuzonRegalos"
        ];

        for (const tbl of tablesWithUserId) {
            try {
                const q = `DELETE FROM dbo.[${tbl}] WHERE UserId <> 1`;
                const res = await pool.request().query(q);
                console.log(`   ✔️ [${tbl}] por UserId: ${res.rowsAffected[0] || 0} eliminados`);
            } catch (e1) {
                try {
                    const q2 = `DELETE FROM dbo.[${tbl}] WHERE UsuarioId <> 1`;
                    const res2 = await pool.request().query(q2);
                    console.log(`   ✔️ [${tbl}] por UsuarioId: ${res2.rowsAffected[0] || 0} eliminados`);
                } catch (e2) {
                    // Si no tiene UserId ni UsuarioId
                }
            }
        }

        // Ahora eliminamos los usuarios de dbo.Usuarios
        console.log('🗑️ Eliminando usuarios de dbo.Usuarios...');
        const delUsers = await pool.request().query("DELETE FROM dbo.Usuarios WHERE Id <> 1 AND LOWER(Username) <> 'admin'");
        console.log(`   ✔️ Usuarios eliminados de dbo.Usuarios: ${delUsers.rowsAffected[0] || 0}`);

        // Verificar tabla de usuarios
        const check = await pool.request().query('SELECT Id, Username, Email FROM dbo.Usuarios');
        console.log('\n👥 Usuarios en dbo.Usuarios:');
        console.table(check.recordset);

        // Generar backup actualizado limpio
        console.log('\n📦 Generando archivo .BAK final y limpio...');
        const publicBak = 'C:\\Users\\Public\\AniDimensionDB_latest.bak';
        const destBak = path.join(__dirname, '..', 'backups', 'AniDimensionDB_latest.bak');

        await pool.request().query(`BACKUP DATABASE [AniDimensionDB] TO DISK = N'${publicBak}' WITH FORMAT, INIT, NAME = N'AniDimensionDB-Clean-AdminOnly', STATS = 10`);

        if (fs.existsSync(publicBak)) {
            fs.copyFileSync(publicBak, destBak);
            const stats = fs.statSync(destBak);
            console.log('🎉 ✅ ¡BACKUP DEFINITIVO LISTO PARA EL VPS!');
            console.log('📂', destBak);
            console.log('📊 Peso:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

cleanNonAdminUsersStrict();
