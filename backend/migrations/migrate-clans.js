const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');

async function migrate() {
    const clanDir = path.resolve(__dirname, '../../frontend/assets/images/clans');
    if (!fs.existsSync(clanDir)) {
        fs.mkdirSync(clanDir, { recursive: true });
        console.log('[MIGRATION] Created clans image directory:', clanDir);
    }

    const pool = await getPool();

    // 1. Table Clans
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Clans')
        BEGIN
            CREATE TABLE dbo.Clans (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Name VARCHAR(20) NOT NULL UNIQUE,
                Tag VARCHAR(6) NULL,
                EmblemUrl NVARCHAR(300) NOT NULL,
                LeaderUserId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
                Level INT NOT NULL DEFAULT 1,
                Exp BIGINT NOT NULL DEFAULT 0,
                NextLevelExp BIGINT NOT NULL DEFAULT 1000,
                MinLevelReq INT NOT NULL DEFAULT 1,
                NoticeMessage NVARCHAR(500) NULL,
                MaxMembers INT NOT NULL DEFAULT 30,
                Trophies INT NOT NULL DEFAULT 0,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                IsActive BIT NOT NULL DEFAULT 1
            );
            PRINT 'Table Clans created successfully';
        END
    `);

    // 2. Table ClanMembers
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClanMembers')
        BEGIN
            CREATE TABLE dbo.ClanMembers (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                ClanId INT NOT NULL FOREIGN KEY REFERENCES dbo.Clans(Id) ON DELETE CASCADE,
                UserId INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Usuarios(Id),
                Role VARCHAR(20) NOT NULL DEFAULT 'Miembro',
                ContributedExp BIGINT NOT NULL DEFAULT 0,
                JoinedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            PRINT 'Table ClanMembers created successfully';
        END
    `);

    // 3. Table ClanJoinRequests
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClanJoinRequests')
        BEGIN
            CREATE TABLE dbo.ClanJoinRequests (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                ClanId INT NOT NULL FOREIGN KEY REFERENCES dbo.Clans(Id) ON DELETE CASCADE,
                UserId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id),
                Status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                RespondedAt DATETIME NULL
            );
            PRINT 'Table ClanJoinRequests created successfully';
        END
    `);

    console.log('[MIGRATION] Clan tables verified/created successfully!');
    process.exit(0);
}

migrate().catch(e => {
    console.error('[MIGRATION ERROR]', e);
    process.exit(1);
});
