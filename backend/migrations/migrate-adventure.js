const { getPool } = require('../config/db');

async function migrateAdventure() {
    const pool = await getPool();

    // 1. Table UserMedals
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserMedals')
        BEGIN
            CREATE TABLE dbo.UserMedals (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE,
                MedalId VARCHAR(50) NOT NULL,
                UnlockedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CONSTRAINT UQ_User_Medal UNIQUE(UserId, MedalId)
            );
            PRINT 'Table UserMedals created';
        END
    `);

    // 2. Table UserAdventureProgress
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserAdventureProgress')
        BEGIN
            CREATE TABLE dbo.UserAdventureProgress (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE,
                MaxNpcUnlocked INT NOT NULL DEFAULT 1,
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            PRINT 'Table UserAdventureProgress created';
        END
    `);

    // 3. Table UserNpcRecords
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserNpcRecords')
        BEGIN
            CREATE TABLE dbo.UserNpcRecords (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL FOREIGN KEY REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE,
                NpcId INT NOT NULL,
                Wins INT NOT NULL DEFAULT 0,
                Losses INT NOT NULL DEFAULT 0,
                BestTurns INT NOT NULL DEFAULT 999,
                LastDefeatedAt DATETIME NULL,
                CONSTRAINT UQ_User_Npc UNIQUE(UserId, NpcId)
            );
            PRINT 'Table UserNpcRecords created';
        END
    `);

    // 4. Table PackNpcAssignments
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PackNpcAssignments')
        BEGIN
            CREATE TABLE dbo.PackNpcAssignments (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                PackId VARCHAR(20) NOT NULL,
                NpcId INT NOT NULL,
                CONSTRAINT UQ_Pack_Npc UNIQUE(PackId, NpcId)
            );
            PRINT 'Table PackNpcAssignments created';

            -- Inserción inicial de asignaciones por defecto
            -- Cap 1 (NPCs 1-10): LOB (1-5), MRD (6-10)
            -- Cap 2 (NPCs 11-20): MRL (11-15), PSV (16-20)
            -- Cap 3 (NPCs 21-30): LON (21-25), LOD (26-30)
            -- Cap 4 (NPCs 31-40): PGD (31-33), MFC (34-37), DCR (38-40)
            -- Cap 5 (NPCs 41-50): IOC (41-45), AST (46-50)
            INSERT INTO dbo.PackNpcAssignments (PackId, NpcId) VALUES
                ('LOB', 1), ('LOB', 2), ('LOB', 3), ('LOB', 4), ('LOB', 5),
                ('MRD', 6), ('MRD', 7), ('MRD', 8), ('MRD', 9), ('MRD', 10),
                ('MRL', 11), ('MRL', 12), ('MRL', 13), ('MRL', 14), ('MRL', 15),
                ('PSV', 16), ('PSV', 17), ('PSV', 18), ('PSV', 19), ('PSV', 20),
                ('LON', 21), ('LON', 22), ('LON', 23), ('LON', 24), ('LON', 25),
                ('LOD', 26), ('LOD', 27), ('LOD', 28), ('LOD', 29), ('LOD', 30),
                ('PGD', 31), ('PGD', 32), ('PGD', 33),
                ('MFC', 34), ('MFC', 35), ('MFC', 36), ('MFC', 37),
                ('DCR', 38), ('DCR', 39), ('DCR', 40),
                ('IOC', 41), ('IOC', 42), ('IOC', 43), ('IOC', 44), ('IOC', 45),
                ('AST', 46), ('AST', 47), ('AST', 48), ('AST', 49), ('AST', 50);
            PRINT 'Default Pack-NPC assignments seeded';
        END
    `);

    console.log('[MIGRATION] Adventure & Medals database ready!');
    process.exit(0);
}

migrateAdventure().catch(err => {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
});
