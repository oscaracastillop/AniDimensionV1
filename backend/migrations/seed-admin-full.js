const { getPool, sql } = require('../config/db');
const { cardDbCache } = require('../data/sql-card-reader');

async function seedAdminFullDatabaseCollection() {
    console.log('👑 Poblando catálogo oficial 100% desbloqueado en base de datos para Administrador (User ID = 1)...');
    const pool = await getPool();

    try {
        const adminRes = await pool.request().query("SELECT Id FROM dbo.Usuarios WHERE LOWER(Username) = 'admin'");
        if (adminRes.recordset.length === 0) {
            console.error('Usuario Admin no encontrado.');
            process.exit(1);
        }
        const adminId = adminRes.recordset[0].Id;

        // 1. Desbloquear todos los 350 Avatares (AVA-001 a AVA-350) en dbo.UserAvatars
        console.log('  🎨 Insertando todos los 350 avatares en dbo.UserAvatars...');
        for (let i = 1; i <= 350; i++) {
            const code = 'AVA-' + String(i).padStart(3, '0');
            await pool.request()
                .input('Uid', sql.Int, adminId)
                .input('Code', sql.VarChar(50), code)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @Uid AND AvatarCode = @Code)
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                        VALUES (@Uid, @Code, 5.0, 5.0, 3.0, CASE WHEN @Code = 'AVA-001' THEN 1 ELSE 0 END, GETDATE());
                    END
                `);
        }

        // 2. Desbloquear los 2 Tapetes oficiales (MAT-001 y MAT-002) en dbo.UserPlaymats
        console.log('  🌌 Insertando tapetes en dbo.UserPlaymats...');
        for (let i = 1; i <= 2; i++) {
            const code = 'MAT-' + String(i).padStart(3, '0');
            await pool.request()
                .input('Uid', sql.Int, adminId)
                .input('Code', sql.VarChar(50), code)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @Uid AND PlaymatCode = @Code)
                    BEGIN
                        INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt)
                        VALUES (@Uid, @Code, GETDATE());
                    END
                `);
        }

        // 3. Desbloquear las 2 Fundas oficiales (SLV-001 y SLV-002) en dbo.UserSleeves
        console.log('  🛡️ Insertando fundas en dbo.UserSleeves...');
        for (let i = 1; i <= 2; i++) {
            const code = 'SLV-' + String(i).padStart(3, '0');
            await pool.request()
                .input('Uid', sql.Int, adminId)
                .input('Code', sql.VarChar(50), code)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @Uid AND SleeveCode = @Code)
                    BEGIN
                        INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt)
                        VALUES (@Uid, @Code, GETDATE());
                    END
                `);
        }

        // 4. Desbloquear catálogo completo de cartas (x3 copias) en dbo.UserCardsSql
        console.log('  🃏 Insertando catálogo oficial de cartas (x3 copias) en dbo.UserCardsSql...');
        const cardIds = Array.from(cardDbCache.keys()).slice(0, 1500); // Primeras 1500 cartas oficiales
        console.log(`    Total cartas a insertar para Admin: ${cardIds.length}...`);

        for (const cid of cardIds) {
            await pool.request()
                .input('Uid', sql.Int, adminId)
                .input('CardCode', sql.Int, parseInt(cid, 10))
                .query(`
                    MERGE dbo.UserCardsSql AS target
                    USING (SELECT @Uid AS UsuarioId, @CardCode AS CardCode) AS source
                    ON (target.UsuarioId = source.UsuarioId AND target.CardCode = source.CardCode)
                    WHEN MATCHED THEN
                        UPDATE SET target.Quantity = 3
                    WHEN NOT MATCHED THEN
                        INSERT (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                        VALUES (source.UsuarioId, source.CardCode, 3, 'NORMAL', GETDATE());
                `);
        }

        console.log('✅ ¡Catálogo completo de Administrador grabado 100% en la base de datos SQL Server!');
        process.exit(0);
    } catch (err) {
        console.error('Error poblando catálogo admin:', err);
        process.exit(1);
    }
}

seedAdminFullDatabaseCollection();
