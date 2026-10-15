/**
 * Ani-Dimension: Migración de Base de Datos - Tabla dbo.UserAvatars
 * Permite que cada usuario posea instancias únicas e independientes de avatares
 * con sus propios potenciadores (EXP, StarShips, Suerte) por avatar.
 */

const { getPool, sql } = require('../config/db');

async function migrateUserAvatars() {
    console.log('[MIGRATION] Creando/Verificando tabla dbo.UserAvatars...');
    const pool = await getPool();

    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserAvatars')
        BEGIN
            CREATE TABLE dbo.UserAvatars (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL,
                AvatarCode VARCHAR(50) NOT NULL,
                ExpBoost DECIMAL(6,2) NOT NULL DEFAULT 0.0,
                StarshipsBoost DECIMAL(6,2) NOT NULL DEFAULT 0.0,
                LuckBoost DECIMAL(6,2) NOT NULL DEFAULT 0.0,
                IsActive BIT NOT NULL DEFAULT 0,
                AcquiredAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT UQ_User_Avatar UNIQUE (UserId, AvatarCode)
            );
            CREATE INDEX IX_UserAvatars_UserId ON dbo.UserAvatars(UserId);
            PRINT 'Tabla dbo.UserAvatars creada exitosamente.';
        END
    `);

    // Asegurar que cada usuario registrado tenga su AVA-002 inicial (0% boosts) y su avatar activo actual
    const users = await pool.request().query('SELECT Id, Username, AvatarActivoId FROM dbo.Usuarios');
    for (const u of users.recordset) {
        const uid = u.Id;
        const activeCode = (u.AvatarActivoId || 'AVA-002').toUpperCase().trim();
        const isAdmin = (u.Username && u.Username.toLowerCase() === 'admin');

        // 1. Asegurar AVA-002 inicial (0.0% boosts)
        await pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = 'AVA-002')
                BEGIN
                    INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
                    VALUES (@uid, 'AVA-002', 0.0, 0.0, 0.0, CASE WHEN '${activeCode}' = 'AVA-002' THEN 1 ELSE 0 END);
                END
            `);

        // 2. Si es Admin y su avatar activo es AVA-001
        if (isAdmin || activeCode === 'AVA-001') {
            await pool.request()
                .input('uid', sql.Int, uid)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = 'AVA-001')
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
                        VALUES (@uid, 'AVA-001', 5.0, 5.0, 3.0, CASE WHEN '${activeCode}' = 'AVA-001' THEN 1 ELSE 0 END);
                    END
                `);
        }

        // 3. Si tiene otro avatar activo diferente a AVA-002 y AVA-001
        if (activeCode !== 'AVA-002' && activeCode !== 'AVA-001') {
            await pool.request()
                .input('uid', sql.Int, uid)
                .input('code', sql.VarChar(50), activeCode)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = @code)
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
                        VALUES (@uid, @code, 0.0, 0.0, 0.0, 1);
                    END
                `);
        }
    }

    console.log('✅ [MIGRATION] Migración de dbo.UserAvatars completada con éxito.');
}

if (require.main === module) {
    migrateUserAvatars().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { migrateUserAvatars };
