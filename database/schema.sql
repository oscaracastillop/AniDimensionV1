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

        INSERT INTO [dbo].[Usuarios] ([Username], [PasswordHash], [Nivel], [Experiencia], [Starships], [IsAdmin])
        VALUES ('Admin', '$2b$10$DXjH277uRSi.Fq0H63czG.54zthR3PWF/GRANLaOu7Wgc8C2KyDRu', 100, 0, 999999, 1);

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
