-- ============================================================================
-- PROYECTO: CLON DE ANI-DIMENSION ONLINE (MÓDULO 5)
-- SCRIPT T-SQL COMPLETO PARA MICROSOFT SQL SERVER
-- Credenciales: Host: localhost / 127.0.0.1 | User: sa | Pass: oscar1982
-- Database: AniDimensionDB
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'AniDimensionDB')
BEGIN
    CREATE DATABASE [AniDimensionDB];
END
GO

USE [AniDimensionDB];
GO

-- 1. Tabla: Usuarios
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Usuarios]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Usuarios] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Username] VARCHAR(50) NOT NULL,
        [PasswordHash] VARCHAR(255) NOT NULL,
        [Email] VARCHAR(150) NULL,
        [CountryIsoCode] NVARCHAR(5) NULL,
        [Nivel] INT NOT NULL DEFAULT 1,
        [Experiencia] INT NOT NULL DEFAULT 0,
        [Starships] BIGINT NOT NULL DEFAULT 500,
        [IsAdmin] BIT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [IsBanned] BIT NOT NULL DEFAULT 0,
        [BannedUntil] DATETIME NULL,
        [BanReason] NVARCHAR(255) NULL,
        [FundaActivaId] VARCHAR(50) NOT NULL DEFAULT 'default_sleeve',
        [MatActivoId] VARCHAR(50) NOT NULL DEFAULT 'default_mat',
        [FechaCreacion] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_Usuarios] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [UQ_Usuarios_Username] UNIQUE NONCLUSTERED ([Username] ASC)
    );
END
GO

-- 2. Tabla: AvatarStats
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AvatarStats]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AvatarStats] (
        [UsuarioId] INT NOT NULL,
        [BonusExp] DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        [BonusStarships] DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        [BonusSuerte] DECIMAL(5,2) NOT NULL DEFAULT 1.00,
        CONSTRAINT [PK_AvatarStats] PRIMARY KEY CLUSTERED ([UsuarioId] ASC),
        CONSTRAINT [FK_AvatarStats_Usuarios] FOREIGN KEY ([UsuarioId])
            REFERENCES [dbo].[Usuarios] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 3. Tabla: BuzonRegalos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BuzonRegalos]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BuzonRegalos] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UsuarioId] INT NOT NULL,
        [Titulo] VARCHAR(100) NOT NULL,
        [Mensaje] VARCHAR(255) NOT NULL,
        [Starships] BIGINT NOT NULL DEFAULT 1000,
        [Reclamado] BIT NOT NULL DEFAULT 0,
        [FechaCreacion] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_BuzonRegalos] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_BuzonRegalos_Usuarios] FOREIGN KEY ([UsuarioId])
            REFERENCES [dbo].[Usuarios] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 4. Tabla: Banlist (Restricciones Oficiales Konami / YGOPro)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Banlist]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Banlist] (
        [CardId] INT NOT NULL PRIMARY KEY,
        [CardName] VARCHAR(100) NOT NULL,
        [Limit] INT NOT NULL DEFAULT 0 -- 0: Prohibida, 1: Limitada (1 copia), 2: Semi-limitada (2 copias)
    );

    -- Poblar algunos ejemplos oficiales de Banlist (Pot of Greed, Monster Reborn, etc.)
    INSERT INTO [dbo].[Banlist] ([CardId], [CardName], [Limit]) VALUES (55144522, 'Pot of Greed', 0);
    INSERT INTO [dbo].[Banlist] ([CardId], [CardName], [Limit]) VALUES (83764718, 'Monster Reborn', 1);
    INSERT INTO [dbo].[Banlist] ([CardId], [CardName], [Limit]) VALUES (70828912, 'Premature Burial', 0);
    INSERT INTO [dbo].[Banlist] ([CardId], [CardName], [Limit]) VALUES (12580477, 'Raigeki', 1);
END
GO

-- 5. Tabla: Decks (Construcción de Mazos Guardados)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Decks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Decks] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [UsuarioId] INT NOT NULL,
        [Nombre] VARCHAR(100) NOT NULL,
        [MainDeckJson] NVARCHAR(MAX) NOT NULL,
        [ExtraDeckJson] NVARCHAR(MAX) NOT NULL,
        [SideDeckJson] NVARCHAR(MAX) NOT NULL,
        [EsActivo] BIT NOT NULL DEFAULT 0,
        [FechaCreacion] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [PK_Decks] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Decks_Usuarios] FOREIGN KEY ([UsuarioId])
            REFERENCES [dbo].[Usuarios] ([Id]) ON DELETE CASCADE
    );
END
GO

-- 6. Tabla: UserMailbox (Buzón de Regalos y Recompensas Avanzado)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserMailbox]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserMailbox] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UsuarioId] INT NULL, -- NULL = Regalo Global para todos
        [GiftType] NVARCHAR(50) NOT NULL, -- 'STARSHIPS', 'CARD', 'POTENCIADOR', 'AVATAR'
        [Title] NVARCHAR(150) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [PayloadJson] NVARCHAR(MAX) NOT NULL,
        [IsClaimed] BIT NOT NULL DEFAULT 0,
        [ClaimedAt] DATETIME NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [Sender] NVARCHAR(100) NOT NULL DEFAULT 'Administración Ani-Dimension'
    );
END
GO

-- 7. Tabla: UserMailboxGlobalClaims (Reclamos de Regalos Globales)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserMailboxGlobalClaims]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserMailboxGlobalClaims] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [MailboxGiftId] INT NOT NULL,
        [UsuarioId] INT NOT NULL,
        [ClaimedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [UQ_Gift_User] UNIQUE ([MailboxGiftId], [UsuarioId])
    );
END
GO

-- ============================================================================
-- INSERCIÓN AUTOMÁTICA DE CUENTA ADMINISTRADOR OBLIGATORIA
-- Usuario: Admin
-- Password Hash: $2b$10$DXjH277uRSi.Fq0H63czG.54zthR3PWF/GRANLaOu7Wgc8C2KyDRu (oscar1982)
-- IsAdmin: 1
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Usuarios] WHERE [Username] = 'Admin')
BEGIN
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @AdminId INT;

        INSERT INTO [dbo].[Usuarios] ([Username], [PasswordHash], [Email], [CountryIsoCode], [Nivel], [Experiencia], [Starships], [IsAdmin], [IsActive], [AvatarActivoId], [MatActivoId], [FundaActivaId])
        VALUES ('Admin', '$2b$10$DXjH277uRSi.Fq0H63czG.54zthR3PWF/GRANLaOu7Wgc8C2KyDRu', 'admin@anidimension.com', 'CO', 100, 0, 999999, 1, 1, 'AVA-001', 'MAT-001', 'SLV-001');

        SET @AdminId = SCOPE_IDENTITY();

        INSERT INTO [dbo].[AvatarStats] ([UsuarioId], [BonusExp], [BonusStarships], [BonusSuerte])
        VALUES (@AdminId, 10.00, 10.00, 10.00);

        COMMIT TRANSACTION;
        PRINT 'SUCCESS: Cuenta Administrador creada exitosamente con ID: ' + CAST(@AdminId AS VARCHAR);
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        PRINT 'ERROR: No se pudo crear la cuenta de Administrador: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- 8. Tabla: BoosterPackCards (Cartas de Sobres y Expansiones)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BoosterPackCards')
BEGIN
    CREATE TABLE dbo.BoosterPackCards (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PackId NVARCHAR(50) NOT NULL,
        CardId INT NOT NULL,
        CardNumber NVARCHAR(50) NULL,
        CardName NVARCHAR(255) NULL,
        CardType NVARCHAR(100) NULL,
        Atk INT NULL,
        Def INT NULL,
        [Level] INT NULL,
        Attribute NVARCHAR(50) NULL,
        Race NVARCHAR(50) NULL,
        Description NVARCHAR(MAX) NULL,
        Rarity NVARCHAR(50) NOT NULL DEFAULT 'COMMON',
        IsActive BIT NOT NULL DEFAULT 1,
        PackDrop BIT NOT NULL DEFAULT 1,
        DeckUsable BIT NOT NULL DEFAULT 1,
        NpcDrop BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_BoosterPackCards UNIQUE (PackId, CardId)
    );
    CREATE NONCLUSTERED INDEX IX_BoosterPackCards_PackId ON dbo.BoosterPackCards(PackId);
    CREATE NONCLUSTERED INDEX IX_BoosterPackCards_CardId ON dbo.BoosterPackCards(CardId);
END
GO

-- 9. Procedimiento: dbo.sp_ObtenerCartasDeSobres (Con traducción al español desde dbo.texts)
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCartasDeSobres
    @PackId NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        bpc.Id,
        bpc.PackId,
        bpc.CardId,
        bpc.CardNumber,
        bpc.CardName,
        ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
        bpc.CardType,
        bpc.Atk,
        bpc.Def,
        bpc.[Level],
        bpc.Attribute,
        bpc.Race,
        bpc.Description,
        ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
        bpc.Rarity,
        bpc.IsActive,
        bpc.PackDrop,
        bpc.DeckUsable,
        bpc.NpcDrop,
        CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
        CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
    FROM dbo.BoosterPackCards bpc
    LEFT JOIN dbo.texts t ON bpc.CardId = t.id
    WHERE (@PackId IS NULL OR bpc.PackId = @PackId)
    ORDER BY bpc.PackId, bpc.Id ASC;
END
GO

-- 10. Procedimiento: dbo.sp_ObtenerCatalogoSobresYCartas
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCatalogoSobresYCartas
AS
BEGIN
    SET NOCOUNT ON;

    -- Recordset 1: Sobres
    SELECT 
        PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible
    FROM dbo.BoosterPacks
    ORDER BY 
        CASE Series 
            WHEN 'DM' THEN 1 
            WHEN 'GX' THEN 2 
            WHEN '5D' THEN 3 
            ELSE 4 
        END,
        Price ASC;

    -- Recordset 2: Cartas de los sobres
    SELECT 
        bpc.Id,
        bpc.PackId,
        bpc.CardId,
        bpc.CardNumber,
        bpc.CardName,
        ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
        bpc.CardType,
        bpc.Atk,
        bpc.Def,
        bpc.[Level],
        bpc.Attribute,
        bpc.Race,
        bpc.Description,
        ISNULL(t.desc_es, bpc.Description) AS DescriptionEs,
        bpc.Rarity,
        bpc.IsActive,
        bpc.PackDrop,
        bpc.DeckUsable,
        bpc.NpcDrop,
        CONCAT('https://images.ygoprodeck.com/images/cards_small/', bpc.CardId, '.jpg') AS ImageUrl,
        CONCAT('https://images.ygoprodeck.com/images/cards/', bpc.CardId, '.jpg') AS ImageLargeUrl
    FROM dbo.BoosterPackCards bpc
    LEFT JOIN dbo.texts t ON bpc.CardId = t.id
    ORDER BY bpc.PackId, bpc.Id ASC;
END
GO

