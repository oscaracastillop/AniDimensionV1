const { getPool, sql } = require('../config/db');

async function migrateFullDatabase() {
    console.log('🚀 Iniciando Migración Total a Base de Datos y Procedimientos Almacenados Oficiales...');
    const pool = await getPool();

    try {
        // ====================================================================
        // 1. CREACIÓN Y AJUSTE DE TABLAS OFICIALES
        // ====================================================================
        console.log('📦 Verificando y creando tablas de propiedad e inventario...');

        // Asegurar columnas en dbo.Usuarios
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'ActiveSessionToken')
                ALTER TABLE dbo.Usuarios ADD ActiveSessionToken NVARCHAR(100) NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'LastLoginAt')
                ALTER TABLE dbo.Usuarios ADD LastLoginAt DATETIME NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'AvatarActivoId')
                ALTER TABLE dbo.Usuarios ADD AvatarActivoId NVARCHAR(50) NOT NULL CONSTRAINT DF_Usuarios_AvatarActivoId DEFAULT 'AVA-002';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'FundaActivaId')
                ALTER TABLE dbo.Usuarios ADD FundaActivaId NVARCHAR(50) NOT NULL CONSTRAINT DF_Usuarios_FundaActivaId DEFAULT 'SLEEVE-001';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'MatActivoId')
                ALTER TABLE dbo.Usuarios ADD MatActivoId NVARCHAR(50) NOT NULL CONSTRAINT DF_Usuarios_MatActivoId DEFAULT 'MAT-001';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'CountryIsoCode')
                ALTER TABLE dbo.Usuarios ADD CountryIsoCode NVARCHAR(5) NULL CONSTRAINT DF_Usuarios_Country DEFAULT 'CO';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'IsActive')
                ALTER TABLE dbo.Usuarios ADD IsActive BIT NOT NULL CONSTRAINT DF_Usuarios_IsActive DEFAULT 1;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'IsBanned')
                ALTER TABLE dbo.Usuarios ADD IsBanned BIT NOT NULL CONSTRAINT DF_Usuarios_IsBanned DEFAULT 0;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BannedUntil')
                ALTER TABLE dbo.Usuarios ADD BannedUntil DATETIME NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BanReason')
                ALTER TABLE dbo.Usuarios ADD BanReason NVARCHAR(255) NULL;
        `);

        // Tabla dbo.UserCards (Inventario oficial de cartas de cada duelista)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCardsSql')
            BEGIN
                CREATE TABLE dbo.UserCardsSql (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    CardCode INT NOT NULL,
                    Quantity INT NOT NULL DEFAULT 1,
                    FoilType NVARCHAR(50) NOT NULL DEFAULT 'NORMAL',
                    AcquiredAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_UserCardsSql_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserCardsSql_Usuario_Card ON dbo.UserCardsSql(UsuarioId, CardCode);
            END
        `);

        // Tabla dbo.UserPlaymats (Tapetes desbloqueados)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPlaymats')
            BEGIN
                CREATE TABLE dbo.UserPlaymats (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    PlaymatCode VARCHAR(50) NOT NULL,
                    AcquiredAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_UserPlaymats_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserPlaymats_User_Code ON dbo.UserPlaymats(UsuarioId, PlaymatCode);
            END
        `);

        // Tabla dbo.UserSleeves (Fundas desbloqueadas)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserSleeves')
            BEGIN
                CREATE TABLE dbo.UserSleeves (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    SleeveCode VARCHAR(50) NOT NULL,
                    AcquiredAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_UserSleeves_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserSleeves_User_Code ON dbo.UserSleeves(UsuarioId, SleeveCode);
            END
        `);

        // Tabla dbo.UserVipPasses (Pases VIP adquiridos y vigencia)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserVipPasses')
            BEGIN
                CREATE TABLE dbo.UserVipPasses (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    VipCode VARCHAR(50) NOT NULL,
                    ExpiresAt DATETIME NOT NULL,
                    AcquiredAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_UserVipPasses_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
            END
        `);

        // Tabla dbo.BuzonRecompensas (Buzón oficial en SQL Server para potenciadores y regalos)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
            BEGIN
                CREATE TABLE dbo.BuzonRecompensas (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    ItemCode VARCHAR(50) NOT NULL,
                    ItemName NVARCHAR(150) NOT NULL,
                    ItemType VARCHAR(50) NOT NULL,
                    BoostValue DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                    Source NVARCHAR(100) NOT NULL DEFAULT 'Tienda OCG',
                    IsConsumed BIT NOT NULL DEFAULT 0,
                    ConsumedAt DATETIME NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_BuzonRecompensas_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
            END
        `);

        // Tabla dbo.HistorialDuelos (Historial oficial de partidas PvP y NPC)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HistorialDuelos')
            BEGIN
                CREATE TABLE dbo.HistorialDuelos (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NOT NULL,
                    RivalNombre NVARCHAR(100) NOT NULL,
                    EsPvp BIT NOT NULL DEFAULT 0,
                    EsVictoria BIT NOT NULL DEFAULT 0,
                    ExpGanada INT NOT NULL DEFAULT 0,
                    StarshipsGanadas INT NOT NULL DEFAULT 0,
                    CardDropCode INT NULL,
                    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_HistorialDuelos_Usuarios FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
                );
            END
        `);

        console.log('✅ Tablas verificadas y listas.');

        // ====================================================================
        // 2. COMPILACIÓN DE PROCEDIMIENTOS ALMACENADOS OFICIALES
        // ====================================================================

        // SP 1: dbo.sp_RegistrarNuevoUsuario
        console.log('⚡ Compilando dbo.sp_RegistrarNuevoUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_RegistrarNuevoUsuario
                @Username VARCHAR(50),
                @Email VARCHAR(150),
                @PasswordHash VARCHAR(255),
                @CountryIsoCode NVARCHAR(5) = 'CO'
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar duplicidad estricta de Username y Email
                    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE LOWER(Username) = LOWER(@Username))
                    BEGIN
                        THROW 50001, 'El nombre de usuario ya está registrado en el sistema. Elige otro.', 1;
                    END

                    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE LOWER(Email) = LOWER(@Email))
                    BEGIN
                        THROW 50002, 'El correo electrónico ya se encuentra vinculado a otra cuenta.', 1;
                    END

                    -- Validar País
                    DECLARE @IsoCodeValid NVARCHAR(5) = 'CO';
                    IF EXISTS (SELECT 1 FROM dbo.Countries WHERE IsoCode = @CountryIsoCode)
                    BEGIN
                        SET @IsoCodeValid = @CountryIsoCode;
                    END

                    -- 2. Insertar Usuario con 5,000 Starships y Avatar Inicial AVA-002
                    DECLARE @NewUserId INT;
                    INSERT INTO dbo.Usuarios (
                        Username, Email, PasswordHash, Nivel, Experiencia, Starships,
                        IsAdmin, FechaCreacion, FundaActivaId, MatActivoId, AvatarActivoId,
                        CountryIsoCode, IsActive, IsBanned
                    )
                    VALUES (
                        @Username, @Email, @PasswordHash, 1, 0, 5000,
                        0, GETDATE(), NULL, NULL, 'AVA-002',
                        @IsoCodeValid, 1, 0
                    );

                    SET @NewUserId = SCOPE_IDENTITY();

                    -- 3. Asignar Avatar AVA-002 en dbo.UserAvatars y Stats
                    INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                    VALUES (@NewUserId, 'AVA-002', 0.00, 0.00, 0.00, 1, GETDATE());

                    IF NOT EXISTS (SELECT 1 FROM dbo.AvatarStats WHERE UsuarioId = @NewUserId)
                    BEGIN
                        INSERT INTO dbo.AvatarStats (UsuarioId, BonusExp, BonusStarships, BonusSuerte)
                        VALUES (@NewUserId, 0.00, 0.00, 0.00);
                    END

                    -- (Las cuentas nuevas inician sin tapetes ni fundas precargadas)

                    -- 4. Insertar Starter Deck Inicial de 40 Cartas Oficiales
                    DECLARE @StarterDeckJson NVARCHAR(MAX) = '[32274490,32274490,32274490,76103675,80813021,53293545,89091579,36121917,36121917,90357090,76184692,32452818,9159938,1784619,57305373,75356564,75356564,75356564,20060230,44287299,85705804,85705804,85705804,72842870,53375573,2863439,17535588,85639257,33064647,96851799,56283725,80770678,43500484,16353197,76211194,73134081,46130346,63102017,51482758,50045299]';

                    INSERT INTO dbo.Decks (UsuarioId, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo, FechaCreacion)
                    VALUES (@NewUserId, 'Mazo Inicial OCG', @StarterDeckJson, '[]', '[]', 1, GETDATE());

                    -- 5. Poblar las 40 cartas iniciales en dbo.UserCardsSql
                    INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                    SELECT @NewUserId, value, COUNT(*), 'NORMAL', GETDATE()
                    FROM OPENJSON(@StarterDeckJson)
                    GROUP BY value;

                    COMMIT TRANSACTION;

                    -- Retornar duelista creado
                    SELECT 
                        u.Id, u.Username, u.Email, u.Nivel, u.Experiencia, u.Starships, u.IsAdmin,
                        u.AvatarActivoId, u.FundaActivaId, u.MatActivoId, u.CountryIsoCode,
                        c.Name AS CountryName, c.FlagEmoji, c.FlagSvgUrl
                    FROM dbo.Usuarios u
                    LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
                    WHERE u.Id = @NewUserId;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0
                        ROLLBACK TRANSACTION;

                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    DECLARE @ErrNum INT = ERROR_NUMBER();
                    THROW @ErrNum, @ErrMsg, 1;
                END CATCH
            END
        `);

        // SP 2: dbo.sp_AutenticarUsuario (Sesión Única Antifraude)
        console.log('⚡ Compilando dbo.sp_AutenticarUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_AutenticarUsuario
                @Username VARCHAR(50),
                @NewSessionToken NVARCHAR(100),
                @ForceLogin BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Buscar usuario
                DECLARE @UserId INT, @IsActive BIT, @IsBanned BIT, @BannedUntil DATETIME, @BanReason NVARCHAR(255), @ActiveToken NVARCHAR(100);
                SELECT 
                    @UserId = Id, 
                    @IsActive = ISNULL(IsActive, 1), 
                    @IsBanned = ISNULL(IsBanned, 0),
                    @BannedUntil = BannedUntil,
                    @BanReason = BanReason,
                    @ActiveToken = ActiveSessionToken
                FROM dbo.Usuarios
                WHERE LOWER(Username) = LOWER(@Username);

                IF @UserId IS NULL
                BEGIN
                    SELECT 0 AS Success, 'Usuario no encontrado.' AS Message;
                    RETURN;
                END

                IF @IsActive = 0
                BEGIN
                    SELECT 0 AS Success, 'Tu cuenta se encuentra inactiva. Contacta al Administrador.' AS Message;
                    RETURN;
                END

                IF @BannedUntil IS NOT NULL AND @BannedUntil > GETDATE()
                BEGIN
                    SELECT 0 AS Success, CONCAT('Cuenta suspendida hasta ', CONVERT(VARCHAR, @BannedUntil, 120), '. Motivo: ', ISNULL(@BanReason, 'Sanción')) AS Message;
                    RETURN;
                END

                -- Validar conflicto de sesión única si no es force
                IF @ForceLogin = 0 AND @ActiveToken IS NOT NULL AND LEN(TRIM(@ActiveToken)) > 0
                BEGIN
                    SELECT 
                        0 AS Success, 
                        1 AS SessionConflict,
                        'Esta cuenta ya tiene una sesión activa en otro dispositivo. Se requiere confirmación para transferir la sesión.' AS Message;
                    RETURN;
                END

                -- Asignar nuevo SessionToken e invalidar el anterior
                UPDATE dbo.Usuarios
                SET ActiveSessionToken = @NewSessionToken,
                    LastLoginAt = GETDATE()
                WHERE Id = @UserId;

                -- Retornar perfil completo
                SELECT 
                    1 AS Success,
                    u.Id, u.Username, u.Email, u.Nivel, u.Experiencia, u.Starships, u.IsAdmin,
                    u.AvatarActivoId, u.FundaActivaId, u.MatActivoId, u.CountryIsoCode,
                    u.ActiveSessionToken AS SessionToken,
                    c.Name AS CountryName, c.FlagEmoji, c.FlagSvgUrl,
                    ISNULL(s.BonusExp, 0.00) AS BonusExp,
                    ISNULL(s.BonusStarships, 0.00) AS BonusStarships,
                    ISNULL(s.BonusSuerte, 0.00) AS BonusSuerte
                FROM dbo.Usuarios u
                LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
                LEFT JOIN dbo.AvatarStats s ON u.Id = s.UsuarioId
                WHERE u.Id = @UserId;
            END
        `);

        // SP 3: dbo.sp_VerificarSesionYRol
        console.log('⚡ Compilando dbo.sp_VerificarSesionYRol...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_VerificarSesionYRol
                @UserId INT,
                @SessionToken NVARCHAR(100)
            AS
            BEGIN
                SET NOCOUNT ON;

                SELECT 
                    CASE WHEN ActiveSessionToken = @SessionToken THEN 1 ELSE 0 END AS IsValidSession,
                    IsAdmin,
                    IsActive,
                    Starships,
                    Nivel,
                    Experiencia,
                    AvatarActivoId,
                    FundaActivaId,
                    MatActivoId
                FROM dbo.Usuarios
                WHERE Id = @UserId;
            END
        `);

        // SP 4: dbo.sp_CerrarSesion
        console.log('⚡ Compilando dbo.sp_CerrarSesion...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_CerrarSesion
                @UserId INT = NULL,
                @Username VARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                IF @UserId IS NOT NULL
                BEGIN
                    UPDATE dbo.Usuarios SET ActiveSessionToken = NULL WHERE Id = @UserId;
                END
                ELSE IF @Username IS NOT NULL
                BEGIN
                    UPDATE dbo.Usuarios SET ActiveSessionToken = NULL WHERE LOWER(Username) = LOWER(@Username);
                END
                SELECT 1 AS Success, 'Sesión cerrada correctamente.' AS Message;
            END
        `);

        // SP 5: dbo.sp_ObtenerDeckEInventario
        console.log('⚡ Compilando dbo.sp_ObtenerDeckEInventario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerDeckEInventario
                @UserId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. Mazo Activo
                SELECT TOP 1 Id, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo
                FROM dbo.Decks
                WHERE UsuarioId = @UserId AND EsActivo = 1
                ORDER BY Id DESC;

                -- 2. Inventario de Cartas reales en SQL Server
                SELECT CardCode, Quantity, FoilType, AcquiredAt
                FROM dbo.UserCardsSql
                WHERE UsuarioId = @UserId
                ORDER BY CardCode ASC;
            END
        `);

        // SP 6: dbo.sp_GuardarDeckUsuario
        console.log('⚡ Compilando dbo.sp_GuardarDeckUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GuardarDeckUsuario
                @UserId INT,
                @Nombre VARCHAR(100) = 'Mazo Principal',
                @MainDeckJson NVARCHAR(MAX),
                @ExtraDeckJson NVARCHAR(MAX) = '[]',
                @SideDeckJson NVARCHAR(MAX) = '[]'
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- Validar si existe mazo activo y actualizarlo o crearlo
                    IF EXISTS (SELECT 1 FROM dbo.Decks WHERE UsuarioId = @UserId AND EsActivo = 1)
                    BEGIN
                        UPDATE dbo.Decks
                        SET Nombre = @Nombre,
                            MainDeckJson = @MainDeckJson,
                            ExtraDeckJson = @ExtraDeckJson,
                            SideDeckJson = @SideDeckJson
                        WHERE UsuarioId = @UserId AND EsActivo = 1;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Decks (UsuarioId, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo, FechaCreacion)
                        VALUES (@UserId, @Nombre, @MainDeckJson, @ExtraDeckJson, @SideDeckJson, 1, GETDATE());
                    END

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, 'Mazo guardado exitosamente en base de datos.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50010, @Err, 1;
                END CATCH
            END
        `);

        // SP 7: dbo.sp_ComprarAbrirSobre (Transaccional y atómico)
        console.log('⚡ Compilando dbo.sp_ComprarAbrirSobre...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarAbrirSobre
                @UserId INT,
                @PackId VARCHAR(20),
                @CostStarships INT,
                @Card1 INT,
                @Card2 INT,
                @Card3 INT,
                @Card4 INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Verificar saldo
                    DECLARE @CurrentBalance BIGINT;
                    SELECT @CurrentBalance = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    IF @CurrentBalance IS NULL
                    BEGIN
                        THROW 50020, 'Usuario no existe.', 1;
                    END

                    IF @CurrentBalance < @CostStarships
                    BEGIN
                        THROW 50021, 'Saldo insuficiente de StarShips para adquirir este sobre.', 1;
                    END

                    -- 2. Deducir StarShips
                    UPDATE dbo.Usuarios
                    SET Starships = Starships - @CostStarships
                    WHERE Id = @UserId;

                    -- 3. Insertar / Actualizar las 4 cartas en dbo.UserCardsSql
                    DECLARE @CardsTable TABLE (CardCode INT);
                    INSERT INTO @CardsTable VALUES (@Card1), (@Card2), (@Card3), (@Card4);

                    MERGE dbo.UserCardsSql AS target
                    USING (
                        SELECT CardCode, COUNT(*) AS Qty
                        FROM @CardsTable
                        GROUP BY CardCode
                    ) AS source
                    ON (target.UsuarioId = @UserId AND target.CardCode = source.CardCode)
                    WHEN MATCHED THEN
                        UPDATE SET target.Quantity = target.Quantity + source.Qty
                    WHEN NOT MATCHED THEN
                        INSERT (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                        VALUES (@UserId, source.CardCode, source.Qty, 'NORMAL', GETDATE());

                    DECLARE @NewBalance BIGINT;
                    SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        @NewBalance AS NewStarshipsBalance,
                        'Sobre abierto y 4 cartas añadidas a tu colección oficial.' AS Message;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50022, @ErrMsg, 1;
                END CATCH
            END
        `);

        // SP 8: dbo.sp_ObtenerCosmeticosUsuario
        console.log('⚡ Compilando dbo.sp_ObtenerCosmeticosUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerCosmeticosUsuario
                @UserId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Avatares
                SELECT AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt
                FROM dbo.UserAvatars
                WHERE UserId = @UserId;

                -- Tapetes
                SELECT PlaymatCode, AcquiredAt
                FROM dbo.UserPlaymats
                WHERE UsuarioId = @UserId;

                -- Fundas
                SELECT SleeveCode, AcquiredAt
                FROM dbo.UserSleeves
                WHERE UsuarioId = @UserId;

                -- Pases VIP activos
                SELECT VipCode, ExpiresAt, AcquiredAt
                FROM dbo.UserVipPasses
                WHERE UsuarioId = @UserId AND ExpiresAt > GETDATE();
            END
        `);

        // SP 9: dbo.sp_ComprarCosmetico
        console.log('⚡ Compilando dbo.sp_ComprarCosmetico...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarCosmetico
                @UserId INT,
                @ItemType VARCHAR(20), -- 'AVATAR', 'PLAYMAT', 'SLEEVE', 'VIP'
                @ItemCode VARCHAR(50),
                @CostStarships INT = 0,
                @ExpBoost DECIMAL(5,2) = NULL,
                @StarshipsBoost DECIMAL(5,2) = NULL,
                @LuckBoost DECIMAL(5,2) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @CurrentStars BIGINT;
                    SELECT @CurrentStars = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    IF @CurrentStars < @CostStarships
                    BEGIN
                        THROW 50030, 'Saldo insuficiente de StarShips.', 1;
                    END

                    -- Descontar precio
                    IF @CostStarships > 0
                    BEGIN
                        UPDATE dbo.Usuarios SET Starships = Starships - @CostStarships WHERE Id = @UserId;
                        INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                        VALUES (@UserId, -@CostStarships, 'Compra de ' + @ItemType + ': ' + @ItemCode, 'COSMETIC_PURCHASE', GETDATE());
                    END

                    IF @ItemType = 'AVATAR'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ItemCode)
                        BEGIN
                            INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                            VALUES (@UserId, @ItemCode, ISNULL(@ExpBoost, 0.00), ISNULL(@StarshipsBoost, 0.00), ISNULL(@LuckBoost, 0.00), 0, GETDATE());
                        END
                        ELSE
                        BEGIN
                            UPDATE dbo.UserAvatars 
                            SET ExpBoost = ISNULL(@ExpBoost, ExpBoost),
                                StarshipsBoost = ISNULL(@StarshipsBoost, StarshipsBoost),
                                LuckBoost = ISNULL(@LuckBoost, LuckBoost)
                            WHERE UserId = @UserId AND AvatarCode = @ItemCode;
                        END
                    END
                    ELSE IF @ItemType = 'PLAYMAT'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UserId AND PlaymatCode = @ItemCode)
                        BEGIN
                            INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt)
                            VALUES (@UserId, @ItemCode, GETDATE());
                        END
                    END
                    ELSE IF @ItemType = 'SLEEVE'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UserId AND SleeveCode = @ItemCode)
                        BEGIN
                            INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt)
                            VALUES (@UserId, @ItemCode, GETDATE());
                        END
                    END
                    ELSE IF @ItemType = 'VIP'
                    BEGIN
                        INSERT INTO dbo.UserVipPasses (UsuarioId, VipCode, ExpiresAt, AcquiredAt)
                        VALUES (@UserId, @ItemCode, DATEADD(DAY, 30, GETDATE()), GETDATE());
                    END

                    DECLARE @NewBal BIGINT;
                    SELECT @NewBal = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, @NewBal AS NewStarshipsBalance, 'Artículo adquirido con éxito.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50031, @ErrMsg, 1;
                END CATCH
            END
        `);

        // SP 10: dbo.sp_EquiparCosmetico
        console.log('⚡ Compilando dbo.sp_EquiparCosmetico...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_EquiparCosmetico
                @UserId INT,
                @ItemType VARCHAR(20), -- 'AVATAR', 'PLAYMAT', 'SLEEVE'
                @ItemCode VARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                IF @ItemType = 'AVATAR'
                BEGIN
                    IF @ItemCode IS NULL OR @ItemCode = '' OR @ItemCode = 'NONE' OR @ItemCode = 'DEFAULT' OR @ItemCode = 'null'
                    BEGIN
                        UPDATE dbo.Usuarios SET AvatarActivoId = NULL WHERE Id = @UserId;
                        UPDATE dbo.UserAvatars SET IsActive = 0 WHERE UserId = @UserId;
                        SELECT 1 AS Success, 'Avatar desequipado.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres dueño de este avatar.' AS Message;
                        RETURN;
                    END
                    UPDATE dbo.Usuarios SET AvatarActivoId = @ItemCode WHERE Id = @UserId;
                    UPDATE dbo.UserAvatars SET IsActive = CASE WHEN AvatarCode = @ItemCode THEN 1 ELSE 0 END WHERE UserId = @UserId;
                END
                ELSE IF @ItemType = 'PLAYMAT'
                BEGIN
                    IF @ItemCode IS NULL OR @ItemCode = '' OR @ItemCode = 'NONE' OR @ItemCode = 'DEFAULT' OR @ItemCode = 'null'
                    BEGIN
                        UPDATE dbo.Usuarios SET MatActivoId = NULL WHERE Id = @UserId;
                        SELECT 1 AS Success, 'Tapete desactivado. Campo predeterminado activado.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UserId AND PlaymatCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres dueño de este tapete.' AS Message;
                        RETURN;
                    END
                    UPDATE dbo.Usuarios SET MatActivoId = @ItemCode WHERE Id = @UserId;
                END
                ELSE IF @ItemType = 'SLEEVE'
                BEGIN
                    IF @ItemCode IS NULL OR @ItemCode = '' OR @ItemCode = 'NONE' OR @ItemCode = 'DEFAULT' OR @ItemCode = 'null'
                    BEGIN
                        UPDATE dbo.Usuarios SET FundaActivaId = NULL WHERE Id = @UserId;
                        SELECT 1 AS Success, 'Funda desactivada. Funda predeterminada activada.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UserId AND SleeveCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres dueño de esta funda.' AS Message;
                        RETURN;
                    END
                    UPDATE dbo.Usuarios SET FundaActivaId = @ItemCode WHERE Id = @UserId;
                END

                SELECT 1 AS Success, 'Artículo equipado correctamente.' AS Message;
            END
        `);

        // SP 11: dbo.sp_ObtenerBuzonYStats
        console.log('⚡ Compilando dbo.sp_ObtenerBuzonYStats...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerBuzonYStats
                @UserId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Estadísticas de Avatar
                SELECT BonusExp, BonusStarships, BonusSuerte
                FROM dbo.AvatarStats
                WHERE UsuarioId = @UserId;

                -- Buzón de Recompensas pendiente
                SELECT Id, ItemCode, ItemName, ItemType, BoostValue, Source, CreatedAt
                FROM dbo.BuzonRecompensas
                WHERE UsuarioId = @UserId AND IsConsumed = 0
                ORDER BY Id DESC;
            END
        `);

        // SP 12: dbo.sp_ComprarPotenciador
        console.log('⚡ Compilando dbo.sp_ComprarPotenciador...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarPotenciador
                @UserId INT,
                @ItemCode VARCHAR(50),
                @ItemName NVARCHAR(150),
                @ItemType VARCHAR(50),
                @BoostValue DECIMAL(5,2),
                @CostStarships INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @Stars BIGINT;
                    SELECT @Stars = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    IF @Stars < @CostStarships
                    BEGIN
                        THROW 50040, 'Saldo insuficiente de StarShips.', 1;
                    END

                    UPDATE dbo.Usuarios SET Starships = Starships - @CostStarships WHERE Id = @UserId;

                    INSERT INTO dbo.BuzonRecompensas (UsuarioId, ItemCode, ItemName, ItemType, BoostValue, Source, IsConsumed, CreatedAt)
                    VALUES (@UserId, @ItemCode, @ItemName, @ItemType, @BoostValue, 'Tienda de Potenciadores', 0, GETDATE());

                    DECLARE @NewB BIGINT;
                    SELECT @NewB = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, @NewB AS NewStarshipsBalance, 'Potenciador adquirido y enviado a tu buzón oficial.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50041, @ErrMsg, 1;
                END CATCH
            END
        `);

        // SP 13: dbo.sp_ConsumirPotenciadorBuzon
        console.log('⚡ Compilando dbo.sp_ConsumirPotenciadorBuzon...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ConsumirPotenciadorBuzon
                @UserId INT,
                @BuzonItemId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @ItemType VARCHAR(50), @BoostValue DECIMAL(5,2), @IsConsumed BIT;
                    SELECT @ItemType = UPPER(ItemType), @BoostValue = BoostValue, @IsConsumed = IsConsumed
                    FROM dbo.BuzonRecompensas
                    WHERE Id = @BuzonItemId AND UsuarioId = @UserId;

                    IF @ItemType IS NULL
                    BEGIN
                        THROW 50050, 'El ítem no existe en tu buzón.', 1;
                    END

                    IF @IsConsumed = 1
                    BEGIN
                        THROW 50051, 'Este ítem ya ha sido consumido previamente.', 1;
                    END

                    -- Asegurar que exista registro en dbo.AvatarStats
                    IF NOT EXISTS (SELECT 1 FROM dbo.AvatarStats WHERE UsuarioId = @UserId)
                    BEGIN
                        INSERT INTO dbo.AvatarStats (UsuarioId, BonusExp, BonusStarships, BonusSuerte) VALUES (@UserId, 0, 0, 0);
                    END

                    DECLARE @CurrentBonus DECIMAL(5,2) = 0.00;
                    DECLARE @MaxCap DECIMAL(5,2) = 300.00;

                    IF @ItemType = 'SUERTE' OR @ItemType = 'LUCK'
                    BEGIN
                        SET @MaxCap = 100.00;
                        SELECT @CurrentBonus = BonusSuerte FROM dbo.AvatarStats WHERE UsuarioId = @UserId;
                    END
                    ELSE IF @ItemType = 'STARSHIPS' OR @ItemType = 'STAR'
                    BEGIN
                        SET @MaxCap = 300.00;
                        SELECT @CurrentBonus = BonusStarships FROM dbo.AvatarStats WHERE UsuarioId = @UserId;
                    END
                    ELSE -- EXP
                    BEGIN
                        SET @MaxCap = 300.00;
                        SELECT @CurrentBonus = BonusExp FROM dbo.AvatarStats WHERE UsuarioId = @UserId;
                    END

                    IF (@CurrentBonus + @BoostValue) > @MaxCap
                    BEGIN
                        THROW 50052, 'El potenciador superaría el límite máximo permitido (EXP 300%, StarShips 300%, Suerte 100%).', 1;
                    END

                    -- Aplicar bonificación
                    IF @ItemType = 'SUERTE' OR @ItemType = 'LUCK'
                    BEGIN
                        UPDATE dbo.AvatarStats SET BonusSuerte = BonusSuerte + @BoostValue WHERE UsuarioId = @UserId;
                    END
                    ELSE IF @ItemType = 'STARSHIPS' OR @ItemType = 'STAR'
                    BEGIN
                        UPDATE dbo.AvatarStats SET BonusStarships = BonusStarships + @BoostValue WHERE UsuarioId = @UserId;
                    END
                    ELSE
                    BEGIN
                        UPDATE dbo.AvatarStats SET BonusExp = BonusExp + @BoostValue WHERE UsuarioId = @UserId;
                    END

                    -- Marcar ítem consumido
                    UPDATE dbo.BuzonRecompensas
                    SET IsConsumed = 1, ConsumedAt = GETDATE()
                    WHERE Id = @BuzonItemId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        s.BonusExp, s.BonusStarships, s.BonusSuerte,
                        'Potenciador aplicado exitosamente a tus estadísticas oficiales.' AS Message
                    FROM dbo.AvatarStats s
                    WHERE s.UsuarioId = @UserId;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50053, @ErrMsg, 1;
                END CATCH
            END
        `);

        // SP 14: dbo.sp_FinalizarDueloRecompensas
        console.log('⚡ Compilando dbo.sp_FinalizarDueloRecompensas...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_FinalizarDueloRecompensas
                @UserId INT,
                @RivalNombre NVARCHAR(100),
                @EsPvp BIT,
                @EsVictoria BIT,
                @BaseExp INT = 100,
                @BaseStarships INT = 150,
                @CardDropCode INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @ExpEarned INT = 0;
                    DECLARE @StarsEarned INT = 0;
                    DECLARE @BonusExp DECIMAL(5,2) = 0.00;
                    DECLARE @BonusStar DECIMAL(5,2) = 0.00;

                    SELECT @BonusExp = BonusExp, @BonusStar = BonusStarships
                    FROM dbo.AvatarStats
                    WHERE UsuarioId = @UserId;

                    IF @EsVictoria = 1
                    BEGIN
                        SET @ExpEarned = ROUND(@BaseExp * (1.0 + ISNULL(@BonusExp, 0.0) / 100.0), 0);
                        SET @StarsEarned = ROUND(@BaseStarships * (1.0 + ISNULL(@BonusStar, 0.0) / 100.0), 0);
                    END

                    -- Actualizar Starships y Experiencia en dbo.Usuarios
                    UPDATE dbo.Usuarios
                    SET Starships = Starships + @StarsEarned,
                        Experiencia = Experiencia + @ExpEarned
                    WHERE Id = @UserId;

                    -- Calcular Subida de Nivel (Cada nivel requiere Nivel * 1000 EXP)
                    DECLARE @CurrentNivel INT, @CurrentExp INT;
                    SELECT @CurrentNivel = Nivel, @CurrentExp = Experiencia FROM dbo.Usuarios WHERE Id = @UserId;

                    DECLARE @ExpNextLevel INT = @CurrentNivel * 1000;
                    WHILE @CurrentExp >= @ExpNextLevel
                    BEGIN
                        SET @CurrentNivel = @CurrentNivel + 1;
                        SET @CurrentExp = @CurrentExp - @ExpNextLevel;
                        SET @ExpNextLevel = @CurrentNivel * 1000;
                    END

                    UPDATE dbo.Usuarios
                    SET Nivel = @CurrentNivel,
                        Experiencia = @CurrentExp
                    WHERE Id = @UserId;

                    -- Si hubo drop de carta y fue victoria, insertar en dbo.UserCardsSql
                    IF @EsVictoria = 1 AND @CardDropCode IS NOT NULL AND @CardDropCode > 0
                    BEGIN
                        IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @UserId AND CardCode = @CardDropCode)
                        BEGIN
                            UPDATE dbo.UserCardsSql SET Quantity = Quantity + 1 WHERE UsuarioId = @UserId AND CardCode = @CardDropCode;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                            VALUES (@UserId, @CardDropCode, 1, 'NORMAL', GETDATE());
                        END
                    END

                    -- Registrar historial de duelo
                    INSERT INTO dbo.HistorialDuelos (UsuarioId, RivalNombre, EsPvp, EsVictoria, ExpGanada, StarshipsGanadas, CardDropCode, Fecha)
                    VALUES (@UserId, @RivalNombre, @EsPvp, @EsVictoria, @ExpEarned, @StarsEarned, @CardDropCode, GETDATE());

                    DECLARE @FinalStarships BIGINT;
                    SELECT @FinalStarships = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        @EsVictoria AS IsVictory,
                        @ExpEarned AS ExpEarned,
                        @StarsEarned AS StarshipsEarned,
                        @CurrentNivel AS Nivel,
                        @CurrentExp AS Experiencia,
                        @FinalStarships AS TotalStarships,
                        @CardDropCode AS CardDropped;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50060, @ErrMsg, 1;
                END CATCH
            END
        `);

        // ====================================================================
        // 3. SINCRONIZACIÓN DE CARTAS INICIALES PARA USUARIOS EXISTENTES
        // ====================================================================
        console.log('🔄 Sincronizando inventario inicial para usuarios existentes que no tengan cartas...');
        await pool.request().query(`
            DECLARE @StarterDeck NVARCHAR(MAX) = '[32274490,32274490,32274490,76103675,80813021,53293545,89091579,36121917,36121917,90357090,76184692,32452818,9159938,1784619,57305373,75356564,75356564,75356564,20060230,44287299,85705804,85705804,85705804,72842870,53375573,2863439,17535588,85639257,33064647,96851799,56283725,80770678,43500484,16353197,76211194,73134081,46130346,63102017,51482758,50045299]';

            INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
            SELECT u.Id, c.value, COUNT(*), 'NORMAL', GETDATE()
            FROM dbo.Usuarios u
            CROSS JOIN OPENJSON(@StarterDeck) c
            WHERE NOT EXISTS (SELECT 1 FROM dbo.UserCardsSql uc WHERE uc.UsuarioId = u.Id)
            GROUP BY u.Id, c.value;
        `);

        console.log('🎉 ¡MIGRACIÓN TOTAL A PROCEDIMIENTOS ALMACENADOS COMPLETADA CON ÉXITO!');
        process.exit(0);

    } catch (err) {
        console.error('❌ ERROR DURANTE LA MIGRACIÓN:', err);
        process.exit(1);
    }
}

migrateFullDatabase();
