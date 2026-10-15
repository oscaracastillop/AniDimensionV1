/**
 * Ani-Dimension: Migración de Tablas de Chat Global, Mensajes, Configuración y Eventos en Vivo
 */

const { getPool, sql } = require('../config/db');

async function migrateChatEvents() {
    console.log('[MIGRATION] Creando tablas de Chat Global y Eventos en Vivo...');
    const pool = await getPool();

    // 1. dbo.ChatMessages (Historial de mensajes)
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatMessages')
        BEGIN
            CREATE TABLE dbo.ChatMessages (
                Id BIGINT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL,
                Username VARCHAR(50) NOT NULL,
                AvatarCode VARCHAR(50) NOT NULL DEFAULT 'AVA-002',
                ClanTag VARCHAR(20) NULL,
                Message NVARCHAR(1000) NOT NULL,
                TextColor VARCHAR(30) NOT NULL DEFAULT '#FFFFFF',
                IsAdmin BIT NOT NULL DEFAULT 0,
                IsSystem BIT NOT NULL DEFAULT 0,
                IsPinned BIT NOT NULL DEFAULT 0,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            CREATE INDEX IX_ChatMessages_CreatedAt ON dbo.ChatMessages(CreatedAt DESC);
            PRINT 'Tabla dbo.ChatMessages creada exitosamente.';
        END
    `);

    // 2. dbo.ChatSettings (Bloqueo general y Mensaje Fijado)
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatSettings')
        BEGIN
            CREATE TABLE dbo.ChatSettings (
                Id INT PRIMARY KEY DEFAULT 1,
                IsMuted BIT NOT NULL DEFAULT 0,
                MutedBy VARCHAR(50) NULL,
                PinnedMessage NVARCHAR(500) NULL,
                PinnedColor VARCHAR(30) NOT NULL DEFAULT '#00F0FF',
                PinnedBy VARCHAR(50) NULL,
                UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
            );
            INSERT INTO dbo.ChatSettings (Id, IsMuted, PinnedMessage, PinnedColor) 
            VALUES (1, 0, '¡Bienvenidos al Chat Global Oficial de Ani-Dimension OCG! Respeta las reglas y disfruta los duelos.', '#00F0FF');
            PRINT 'Tabla dbo.ChatSettings creada exitosamente.';
        END
    `);

    // 3. dbo.ChatEvents (Eventos de Adivinanza / Trivia con premios)
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChatEvents')
        BEGIN
            CREATE TABLE dbo.ChatEvents (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                EventType VARCHAR(50) NOT NULL, -- 'WORD_COMPLETION' o 'TRIVIA_QA'
                QuestionOrPrompt NVARCHAR(500) NOT NULL,
                MaskedPrompt NVARCHAR(500) NULL,
                CorrectAnswer NVARCHAR(500) NOT NULL,
                NormalizedAnswer NVARCHAR(500) NOT NULL,
                PrizeText NVARCHAR(300) NOT NULL,
                LaunchCountdownSeconds INT NOT NULL DEFAULT 5,
                Status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'
                WinnerUserId INT NULL,
                WinnerUsername VARCHAR(50) NULL,
                WinnerMessage NVARCHAR(500) NULL,
                PrizeStatus VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DELIVERED'
                DeliveredAt DATETIME NULL,
                CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                CompletedAt DATETIME NULL
            );
            CREATE INDEX IX_ChatEvents_Status ON dbo.ChatEvents(Status);
            PRINT 'Tabla dbo.ChatEvents creada exitosamente.';
        END
    `);

    console.log('✅ [MIGRATION] Tablas de Chat y Eventos en Vivo migradas con éxito.');
}

if (require.main === module) {
    migrateChatEvents().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { migrateChatEvents };
