/**
 * ============================================================================
 * ANI-DIMENSION: MIGRACIÓN MAESTRA DE CATÁLOGOS SQL SERVER Y STORED PROCEDURES
 * ============================================================================
 * - Crea dbo.AvatarsCatalog (Catálogo completo de 350 avatares en SQL Server)
 * - Crea dbo.PotenciadoresCatalog (Catálogo oficial de potenciadores)
 * - Crea dbo.VipPassesCatalog (Catálogo oficial de pases VIP)
 * - Actualiza dbo.sp_ComprarCosmetico (Soporte atómico de 7 parámetros y boost lookup)
 * - Crea dbo.sp_EnviarRegalo (Transaccional individual y masivo/global)
 * - Actualiza dbo.sp_ObtenerBuzonUsuario (Soporte de regalos individuales y globales)
 * - Actualiza dbo.sp_ReclamarRegaloBuzon (Reclamo atómico de TODOS los tipos de regalo)
 */

const { getPool, sql } = require('../config/db');

async function runMigration() {
    console.log('🚀 Iniciando migración maestra de Catálogos y Stored Procedures en SQL Server...');
    const pool = await getPool();

    // =========================================================================
    // 1. TABLA: dbo.AvatarsCatalog
    // =========================================================================
    console.log('📦 1/6: Verificando/Creando tabla dbo.AvatarsCatalog...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AvatarsCatalog')
        BEGIN
            CREATE TABLE dbo.AvatarsCatalog (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Code VARCHAR(50) NOT NULL UNIQUE,
                Name NVARCHAR(100) NOT NULL,
                ImageUrl NVARCHAR(255) NOT NULL,
                ExpBoost DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                StarshipsBoost DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                LuckBoost DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                Currency VARCHAR(20) NOT NULL DEFAULT 'STARSHIPS',
                PriceStarships INT NOT NULL DEFAULT 0,
                PriceUsd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                OfferText NVARCHAR(150) NULL,
                IsVipOnly BIT NOT NULL DEFAULT 0,
                IsActive BIT NOT NULL DEFAULT 1,
                CreatedAt DATETIME DEFAULT GETDATE()
            );
            PRINT 'Tabla dbo.AvatarsCatalog creada.';
        END
    `);

    // =========================================================================
    // 2. TABLA: dbo.PotenciadoresCatalog
    // =========================================================================
    console.log('📦 2/6: Verificando/Creando tabla dbo.PotenciadoresCatalog...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PotenciadoresCatalog')
        BEGIN
            CREATE TABLE dbo.PotenciadoresCatalog (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Code VARCHAR(50) NOT NULL UNIQUE,
                Name NVARCHAR(150) NOT NULL,
                Type VARCHAR(50) NOT NULL, -- 'EXP', 'STARSHIPS', 'SUERTE'
                BoostValue DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                Currency VARCHAR(20) NOT NULL DEFAULT 'STARSHIPS',
                PriceStarships INT NOT NULL DEFAULT 0,
                PriceUsd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                OfferText NVARCHAR(100) NULL,
                Description NVARCHAR(500) NULL,
                IsActive BIT NOT NULL DEFAULT 1,
                CreatedAt DATETIME DEFAULT GETDATE()
            );
            PRINT 'Tabla dbo.PotenciadoresCatalog creada.';
        END
    `);

    // =========================================================================
    // 3. TABLA: dbo.VipPassesCatalog
    // =========================================================================
    console.log('📦 3/6: Verificando/Creando tabla dbo.VipPassesCatalog...');
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VipPassesCatalog')
        BEGIN
            CREATE TABLE dbo.VipPassesCatalog (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Code VARCHAR(50) NOT NULL UNIQUE,
                Name NVARCHAR(100) NOT NULL,
                DurationDays INT NOT NULL DEFAULT 30,
                ExpBoost DECIMAL(5,2) NOT NULL DEFAULT 100.00,
                StarshipsBoost DECIMAL(5,2) NOT NULL DEFAULT 100.00,
                LuckBoost DECIMAL(5,2) NOT NULL DEFAULT 15.00,
                Currency VARCHAR(20) NOT NULL DEFAULT 'USD',
                PriceStarships INT NOT NULL DEFAULT 0,
                PriceUsd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                OfferText NVARCHAR(100) NULL,
                IsActive BIT NOT NULL DEFAULT 1,
                CreatedAt DATETIME DEFAULT GETDATE()
            );
            PRINT 'Tabla dbo.VipPassesCatalog creada.';
        END
    `);

    // =========================================================================
    // 4. POBLAR CATÁLOGOS CON LOS DATOS OFICIALES
    // =========================================================================
    console.log('🌱 4/6: Hidratando catálogo oficial de Avatares (AVA-001 a AVA-350)...');

    // AVA-001 Admin
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.AvatarsCatalog WHERE Code = 'AVA-001')
            INSERT INTO dbo.AvatarsCatalog (Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
            VALUES ('AVA-001', 'Ren Cosmic Admin', '../../../assets/images/avatars/AVA-001.png', 5.0, 5.0, 3.0, 'STARSHIPS', 0, 0.00, 'ADMIN', 1);
    `);

    // AVA-002 Default Inicial
    await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.AvatarsCatalog WHERE Code = 'AVA-002')
            INSERT INTO dbo.AvatarsCatalog (Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
            VALUES ('AVA-002', 'Duelista Iniciado', '../../../assets/images/avatars/AVA-002.png', 0.0, 0.0, 0.0, 'STARSHIPS', 0, 0.00, 'INICIAL', 1);
    `);

    // AVA-003 a AVA-345 por lotes
    let avatarBatchValues = [];
    for (let i = 3; i <= 345; i++) {
        const code = 'AVA-' + String(i).padStart(3, '0');
        avatarBatchValues.push(`('${code}', '${code}', '../../../assets/images/avatars/${code}.png', 3.0, 2.0, 1.0, 'STARSHIPS', 50000, 0.00, 'NUEVO', 1)`);
        
        if (avatarBatchValues.length >= 50 || i === 345) {
            await pool.request().query(`
                INSERT INTO dbo.AvatarsCatalog (Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
                SELECT v.Code, v.Name, v.ImageUrl, v.ExpBoost, v.StarshipsBoost, v.LuckBoost, v.Currency, v.PriceStarships, v.PriceUsd, v.OfferText, v.IsActive
                FROM (VALUES ${avatarBatchValues.join(', ')}) AS v(Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
                WHERE NOT EXISTS (SELECT 1 FROM dbo.AvatarsCatalog c WHERE c.Code = v.Code);
            `);
            avatarBatchValues = [];
        }
    }

    // AVA-346 a AVA-350 Premium Packages
    const premiumAvatars = [
        { code: 'AVA-346', name: 'Avatar Cósmico Élite (Personalizable)', exp: 25.0, star: 25.0, luck: 5.0, usd: 9.99, banner: 'ÉLITE VIP' },
        { code: 'AVA-347', name: 'Avatar Dragón Legendario (Personalizable)', exp: 60.0, star: 60.0, luck: 15.0, usd: 19.99, banner: 'ÉPICO' },
        { code: 'AVA-348', name: 'Avatar Faraón Mítico (Personalizable)', exp: 120.0, star: 120.0, luck: 30.0, usd: 39.99, banner: 'MÍTICO' },
        { code: 'AVA-349', name: 'Avatar Dios Celestial (Personalizable)', exp: 200.0, star: 200.0, luck: 50.0, usd: 79.99, banner: 'DIVINO' },
        { code: 'AVA-350', name: 'Avatar Supremo Omnipotente (FULL MAX)', exp: 300.0, star: 300.0, luck: 100.0, usd: 149.99, banner: 'FULL MAX' }
    ];

    for (const pa of premiumAvatars) {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.AvatarsCatalog WHERE Code = '${pa.code}')
                INSERT INTO dbo.AvatarsCatalog (Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
                VALUES ('${pa.code}', '${pa.name.replace(/'/g, "''")}', '../../../assets/images/avatars/AVA-002.png', ${pa.exp}, ${pa.star}, ${pa.luck}, 'USD', 0, ${pa.usd}, '${pa.banner}', 1);
        `);
    }

    // Hidratar Potenciadores oficiales
    const initialPots = [
        { code: 'POT-001', name: 'Orbe Menor de EXP Cósmica', type: 'EXP', boost: 1.0, curr: 'STARSHIPS', priceStar: 40000, priceUsd: 0, banner: 'BÁSICO', desc: 'Confiere un incremento permanente de +1.0% de EXP ganada en duelos al avatar activo.' },
        { code: 'POT-002', name: 'Orbe Mayor de EXP Cósmica', type: 'EXP', boost: 3.0, curr: 'STARSHIPS', priceStar: 120000, priceUsd: 0, banner: 'POPULAR', desc: 'Confiere un incremento permanente de +3.0% de EXP ganada en duelos al avatar activo.' },
        { code: 'POT-003', name: 'Orbe Sagrado de EXP Máxima', type: 'EXP', boost: 5.0, curr: 'STARSHIPS', priceStar: 200000, priceUsd: 0, banner: 'DESTACADO', desc: 'Máximo poder de EXP con StarShips: otorga +5.0% permanente de EXP en duelos.' },
        { code: 'POT-004', name: 'Sello Astral de StarShips Menor', type: 'STARSHIPS', boost: 1.0, curr: 'STARSHIPS', priceStar: 40000, priceUsd: 0, banner: 'BÁSICO', desc: 'Multiplica de forma permanente las StarShips ganadas en duelos en un +1.0%.' },
        { code: 'POT-005', name: 'Sello Astral de StarShips Mayor', type: 'STARSHIPS', boost: 3.0, curr: 'STARSHIPS', priceStar: 120000, priceUsd: 0, banner: 'POPULAR', desc: 'Multiplica de forma permanente las StarShips ganadas en duelos en un +3.0%.' },
        { code: 'POT-006', name: 'Sello Astral de StarShips Supremo', type: 'STARSHIPS', boost: 5.0, curr: 'STARSHIPS', priceStar: 200000, priceUsd: 0, banner: 'DESTACADO', desc: 'Máximo multiplicador con StarShips: otorga +5.0% permanente de StarShips ganadas en duelos.' },
        { code: 'POT-007', name: 'Dado Trébol de la Suerte', type: 'SUERTE', boost: 0.5, curr: 'STARSHIPS', priceStar: 50000, priceUsd: 0, banner: 'SUERTE', desc: 'Mejora de forma permanente la suerte del avatar activo en un +0.5%.' },
        { code: 'POT-008', name: 'Amuleto Dorado de Suerte Suprema', type: 'SUERTE', boost: 1.0, curr: 'STARSHIPS', priceStar: 150000, priceUsd: 0, banner: 'ÉPICO', desc: 'Máximo incremento de suerte con StarShips: otorga +1.0% permanente de probabilidad de drops raros.' },
        { code: 'POT-009', name: 'Núcleo de EXP Cósmica Titánica', type: 'EXP', boost: 20.0, curr: 'USD', priceStar: 0, priceUsd: 4.99, banner: 'PAQUETE $', desc: 'Potenciador Élite Premium: Aumenta permanentemente +20.0% la EXP ganada en duelos.' },
        { code: 'POT-010', name: 'Generador Cuántico de StarShips', type: 'STARSHIPS', boost: 20.0, curr: 'USD', priceStar: 0, priceUsd: 4.99, banner: 'PAQUETE $', desc: 'Potenciador Élite Premium: Aumenta permanentemente +20.0% todas las StarShips ganadas en duelos.' },
        { code: 'POT-011', name: 'Trébol de 4 Hojas del Milenio', type: 'SUERTE', boost: 5.0, curr: 'USD', priceStar: 0, priceUsd: 6.99, banner: 'SUERTE MÍTICA', desc: 'Multiplicador legendario de Suerte: otorga +5.0% de probabilidad de cartas raras en duelos.' },
        { code: 'POT-012', name: 'Piedra Filosofal Omnipotente', type: 'EXP', boost: 50.0, curr: 'USD', priceStar: 0, priceUsd: 14.99, banner: 'SUPREMO', desc: 'El potenciador más poderoso: Otorga un masivo +50.0% de EXP de forma permanente al avatar activo.' }
    ];

    for (const p of initialPots) {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.PotenciadoresCatalog WHERE Code = '${p.code}')
                INSERT INTO dbo.PotenciadoresCatalog (Code, Name, Type, BoostValue, Currency, PriceStarships, PriceUsd, OfferText, Description, IsActive)
                VALUES ('${p.code}', '${p.name.replace(/'/g, "''")}', '${p.type}', ${p.boost}, '${p.curr}', ${p.priceStar}, ${p.priceUsd}, '${p.banner}', '${p.desc.replace(/'/g, "''")}', 1);
        `);
    }

    // Hidratar Pases VIP oficiales
    const initialVips = [
        { code: 'VIP-001', name: 'Pase VIP Básico', days: 3, exp: 20.0, star: 20.0, luck: 0.0, curr: 'STARSHIPS', pStar: 20000, pUsd: 0, banner: 'BÁSICO' },
        { code: 'VIP-002', name: 'Pase VIP Bronce', days: 7, exp: 40.0, star: 40.0, luck: 5.0, curr: 'USD', pStar: 0, pUsd: 3.99, banner: 'BRONCE' },
        { code: 'VIP-003', name: 'Pase VIP Plata', days: 15, exp: 70.0, star: 70.0, luck: 10.0, curr: 'USD', pStar: 0, pUsd: 7.99, banner: 'PLATA' },
        { code: 'VIP-004', name: 'Pase VIP Oro', days: 30, exp: 100.0, star: 100.0, luck: 15.0, curr: 'USD', pStar: 0, pUsd: 13.99, banner: 'ORO' }
    ];

    for (const v of initialVips) {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.VipPassesCatalog WHERE Code = '${v.code}')
                INSERT INTO dbo.VipPassesCatalog (Code, Name, DurationDays, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsActive)
                VALUES ('${v.code}', '${v.name.replace(/'/g, "''")}', ${v.days}, ${v.exp}, ${v.star}, ${v.luck}, '${v.curr}', ${v.pStar}, ${v.pUsd}, '${v.banner}', 1);
        `);
    }

    // =========================================================================
    // 5. STORED PROCEDURES DE COMPRA Y COSMÉTICOS
    // =========================================================================
    console.log('⚡ 5/6: Compilando Stored Procedure dbo.sp_ComprarCosmetico...');
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

                -- 1. Validar usuario y saldo
                DECLARE @CurrentStars BIGINT;
                SELECT @CurrentStars = Starships FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK) WHERE Id = @UserId;

                IF @CurrentStars IS NULL
                BEGIN
                    THROW 50030, 'Usuario no encontrado en la base de datos.', 1;
                END

                IF @CurrentStars < @CostStarships
                BEGIN
                    THROW 50031, 'Saldo insuficiente de StarShips para realizar la compra.', 1;
                END

                -- 2. Si es AVATAR y los boosts no fueron pasados, obtenerlos de dbo.AvatarsCatalog
                IF @ItemType = 'AVATAR'
                BEGIN
                    IF (@ExpBoost IS NULL OR @StarshipsBoost IS NULL OR @LuckBoost IS NULL) AND EXISTS (SELECT * FROM sys.tables WHERE name = 'AvatarsCatalog')
                    BEGIN
                        SELECT 
                            @ExpBoost = ISNULL(@ExpBoost, ExpBoost),
                            @StarshipsBoost = ISNULL(@StarshipsBoost, StarshipsBoost),
                            @LuckBoost = ISNULL(@LuckBoost, LuckBoost)
                        FROM dbo.AvatarsCatalog
                        WHERE Code = @ItemCode;
                    END
                END

                -- 3. Descontar StarShips
                IF @CostStarships > 0
                BEGIN
                    UPDATE dbo.Usuarios SET Starships = Starships - @CostStarships WHERE Id = @UserId;

                    INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                    VALUES (@UserId, -@CostStarships, 'Compra de ' + @ItemType + ': ' + @ItemCode, 'COSMETIC_PURCHASE', GETDATE());
                END

                -- 4. Registrar artículo según tipo
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

                DECLARE @NewBalance BIGINT;
                SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success, 
                    @NewBalance AS NewStarshipsBalance, 
                    'Artículo adquirido y guardado exitosamente en la base de datos.' AS Message;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        END;
    `);

    // =========================================================================
    // 6. STORED PROCEDURES DE BUZÓN Y REGALOS
    // =========================================================================
    console.log('⚡ 6/6: Compilando Stored Procedures de Buzón (sp_EnviarRegalo, sp_ObtenerBuzonUsuario, sp_ReclamarRegaloBuzon)...');

    // SP 1: dbo.sp_EnviarRegalo
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_EnviarRegalo
            @UsuarioId INT = NULL, -- NULL si es para todos (GLOBAL)
            @GiftType NVARCHAR(50),
            @Title NVARCHAR(150),
            @Description NVARCHAR(500) = NULL,
            @PayloadJson NVARCHAR(MAX) = '{}',
            @Sender NVARCHAR(100) = 'Administración Ani-Dimension'
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;
            BEGIN TRY
                BEGIN TRANSACTION;

                IF @UsuarioId IS NOT NULL AND @UsuarioId > 0
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Id = @UsuarioId)
                    BEGIN
                        THROW 50060, 'El usuario destinatario no existe en la base de datos.', 1;
                    END
                END
                ELSE
                BEGIN
                    SET @UsuarioId = NULL; -- Asegurar NULL para masivo / global
                END

                INSERT INTO dbo.UserMailbox (
                    UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed, Sender, CreatedAt
                )
                VALUES (
                    @UsuarioId, UPPER(LTRIM(RTRIM(@GiftType))), @Title, @Description, @PayloadJson, 0, @Sender, GETDATE()
                );

                DECLARE @NewMailboxId INT = SCOPE_IDENTITY();

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success, 
                    @NewMailboxId AS MailboxId, 
                    CASE WHEN @UsuarioId IS NULL THEN 'GLOBAL' ELSE 'USER' END AS Target,
                    'Regalo enviado exitosamente al buzón.' AS Message;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        END;
    `);

    // SP 2: dbo.sp_ObtenerBuzonUsuario
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ObtenerBuzonUsuario
            @UsuarioId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT 
                m.Id, 
                m.UsuarioId, 
                m.GiftType, 
                m.Title, 
                m.Description, 
                m.PayloadJson, 
                m.CreatedAt, 
                m.Sender,
                CASE WHEN m.UsuarioId IS NULL THEN 1 ELSE 0 END AS IsGlobal
            FROM dbo.UserMailbox m
            WHERE (
                (m.UsuarioId = @UsuarioId AND m.IsClaimed = 0)
                OR 
                (m.UsuarioId IS NULL AND NOT EXISTS (
                    SELECT 1 FROM dbo.UserMailboxGlobalClaims c 
                    WHERE c.MailboxGiftId = m.Id AND c.UsuarioId = @UsuarioId
                ))
            )
            ORDER BY m.CreatedAt DESC;
        END;
    `);

    // SP 3: dbo.sp_ReclamarRegaloBuzon
    await pool.request().query(`
        CREATE OR ALTER PROCEDURE dbo.sp_ReclamarRegaloBuzon
            @UsuarioId INT,
            @MailboxId INT
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;
            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @GiftTargetUserId INT;
                DECLARE @GiftType NVARCHAR(50);
                DECLARE @Title NVARCHAR(150);
                DECLARE @Description NVARCHAR(500);
                DECLARE @PayloadJson NVARCHAR(MAX);
                DECLARE @IsClaimed BIT;

                SELECT 
                    @GiftTargetUserId = UsuarioId,
                    @GiftType = UPPER(LTRIM(RTRIM(GiftType))),
                    @Title = Title,
                    @Description = Description,
                    @PayloadJson = PayloadJson,
                    @IsClaimed = IsClaimed
                FROM dbo.UserMailbox
                WHERE Id = @MailboxId;

                IF @GiftType IS NULL
                BEGIN
                    THROW 50061, 'El regalo especificado no existe en el buzón.', 1;
                END

                -- Validar si es regalo individual o global
                IF @GiftTargetUserId IS NOT NULL
                BEGIN
                    IF @GiftTargetUserId <> @UsuarioId
                    BEGIN
                        THROW 50062, 'Este regalo no pertenece a tu cuenta de duelista.', 1;
                    END
                    IF @IsClaimed = 1
                    BEGIN
                        THROW 50063, 'Este regalo ya fue reclamado previamente.', 1;
                    END

                    -- Marcar como reclamado
                    UPDATE dbo.UserMailbox 
                    SET IsClaimed = 1, ClaimedAt = GETDATE() 
                    WHERE Id = @MailboxId;
                END
                ELSE
                BEGIN
                    -- Regalo GLOBAL
                    IF EXISTS (SELECT 1 FROM dbo.UserMailboxGlobalClaims WHERE MailboxGiftId = @MailboxId AND UsuarioId = @UsuarioId)
                    BEGIN
                        THROW 50064, 'Ya has reclamado previamente este regalo global.', 1;
                    END

                    INSERT INTO dbo.UserMailboxGlobalClaims (MailboxGiftId, UsuarioId, ClaimedAt)
                    VALUES (@MailboxId, @UsuarioId, GETDATE());
                END

                -- ACREDITACIÓN ATÓMICA DE RECOMPENSAS EN BASE DE DATOS SEGÚN TIPO
                DECLARE @NewStarships BIGINT = NULL;

                -- 1. STARSHIPS / ESTRELLAS
                IF @GiftType IN ('STARSHIPS', 'ESTRELLAS')
                BEGIN
                    DECLARE @StarAmt INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.amount') AS INT), 0);
                    IF @StarAmt = 0
                        SET @StarAmt = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.starships') AS INT), 0);

                    IF @StarAmt > 0
                    BEGIN
                        UPDATE dbo.Usuarios 
                        SET Starships = ISNULL(Starships, 0) + @StarAmt 
                        WHERE Id = @UsuarioId;

                        SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                        INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                        VALUES (@UsuarioId, @StarAmt, 'Reclamo buzón: ' + ISNULL(@Title, 'Regalo StarShips'), 'MAILBOX_REWARD', GETDATE());
                    END
                END

                -- 2. EXP / EXPERIENCIA
                ELSE IF @GiftType IN ('EXP', 'EXPERIENCIA')
                BEGIN
                    DECLARE @ExpAmt INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.amount') AS INT), 0);
                    IF @ExpAmt = 0
                        SET @ExpAmt = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.exp') AS INT), 0);

                    IF @ExpAmt > 0
                    BEGIN
                        UPDATE dbo.Usuarios 
                        SET Experiencia = ISNULL(Experiencia, 0) + @ExpAmt 
                        WHERE Id = @UsuarioId;
                    END
                END

                -- 3. AVATAR
                ELSE IF @GiftType = 'AVATAR'
                BEGIN
                    DECLARE @AvatarCode VARCHAR(50) = COALESCE(
                        JSON_VALUE(@PayloadJson, '$.code'),
                        JSON_VALUE(@PayloadJson, '$.avatar_code'),
                        JSON_VALUE(@PayloadJson, '$.image_code'),
                        JSON_VALUE(@PayloadJson, '$.avatarId'),
                        'AVA-002'
                    );
                    DECLARE @AvatarExp DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.exp_boost') AS DECIMAL(5,2)), 0.00);
                    DECLARE @AvatarStar DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.starships_boost') AS DECIMAL(5,2)), 0.00);
                    DECLARE @AvatarLuck DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.luck_boost') AS DECIMAL(5,2)), 0.00);

                    IF @AvatarExp = 0.00 AND @AvatarStar = 0.00 AND @AvatarLuck = 0.00 AND EXISTS (SELECT * FROM sys.tables WHERE name = 'AvatarsCatalog')
                    BEGIN
                        SELECT 
                            @AvatarExp = ExpBoost,
                            @AvatarStar = StarshipsBoost,
                            @AvatarLuck = LuckBoost
                        FROM dbo.AvatarsCatalog
                        WHERE Code = @AvatarCode;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode)
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                        VALUES (@UsuarioId, @AvatarCode, @AvatarExp, @AvatarStar, @AvatarLuck, 0, GETDATE());
                    END
                    ELSE
                    BEGIN
                        UPDATE dbo.UserAvatars 
                        SET ExpBoost = CASE WHEN @AvatarExp > ExpBoost THEN @AvatarExp ELSE ExpBoost END,
                            StarshipsBoost = CASE WHEN @AvatarStar > StarshipsBoost THEN @AvatarStar ELSE StarshipsBoost END,
                            LuckBoost = CASE WHEN @AvatarLuck > LuckBoost THEN @AvatarLuck ELSE LuckBoost END
                        WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode;
                    END
                END

                -- 4. POTENCIADOR
                ELSE IF @GiftType = 'POTENCIADOR'
                BEGIN
                    DECLARE @PotCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'POT-001');
                    DECLARE @PotName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), 'Potenciador');
                    DECLARE @PotType VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.type'), 'EXP');
                    DECLARE @PotBoost DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.boost_value') AS DECIMAL(5,2)), 1.00);

                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
                    BEGIN
                        INSERT INTO dbo.BuzonRecompensas (UsuarioId, ItemCode, ItemName, ItemType, BoostValue, Source, IsConsumed, CreatedAt)
                        VALUES (@UsuarioId, @PotCode, @PotName, @PotType, @PotBoost, 'Regalo Buzón', 0, GETDATE());
                    END
                END

                -- 5. PASE VIP
                ELSE IF @GiftType = 'VIP'
                BEGIN
                    DECLARE @VipCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'VIP-004');
                    DECLARE @VipDays INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.days') AS INT), 30);
                    IF @VipDays <= 0 SET @VipDays = 30;

                    UPDATE dbo.Usuarios
                    SET VipUntil = CASE 
                        WHEN VipUntil IS NOT NULL AND VipUntil > GETDATE() 
                        THEN DATEADD(DAY, @VipDays, VipUntil)
                        ELSE DATEADD(DAY, @VipDays, GETDATE())
                    END
                    WHERE Id = @UsuarioId;

                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UserVipPasses')
                    BEGIN
                        INSERT INTO dbo.UserVipPasses (UsuarioId, VipCode, ExpiresAt, AcquiredAt)
                        SELECT @UsuarioId, @VipCode, VipUntil, GETDATE()
                        FROM dbo.Usuarios WHERE Id = @UsuarioId;
                    END
                END

                -- 6. CARTA OCG (CARD)
                ELSE IF @GiftType = 'CARD'
                BEGIN
                    DECLARE @CardId INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.cardId') AS INT), 0);
                    IF @CardId = 0
                        SET @CardId = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.code') AS INT), 0);
                    DECLARE @CardCopies INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.copies') AS INT), 1);
                    IF @CardCopies <= 0 SET @CardCopies = 1;
                    DECLARE @Foil VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.foil_type'), 'NORMAL');

                    IF @CardId > 0
                    BEGIN
                        IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @UsuarioId AND CardCode = @CardId)
                        BEGIN
                            UPDATE dbo.UserCardsSql 
                            SET Quantity = Quantity + @CardCopies 
                            WHERE UsuarioId = @UsuarioId AND CardCode = @CardId;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                            VALUES (@UsuarioId, @CardId, @CardCopies, @Foil, GETDATE());
                        END
                    END
                END

                -- 7. TAPETE (PLAYMAT)
                ELSE IF @GiftType = 'PLAYMAT'
                BEGIN
                    DECLARE @MatCode VARCHAR(50) = JSON_VALUE(@PayloadJson, '$.code');
                    IF @MatCode IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UsuarioId AND PlaymatCode = @MatCode)
                        BEGIN
                            INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt)
                            VALUES (@UsuarioId, @MatCode, GETDATE());
                        END
                    END
                END

                -- 8. FUNDA (SLEEVE)
                ELSE IF @GiftType = 'SLEEVE'
                BEGIN
                    DECLARE @SlvCode VARCHAR(50) = JSON_VALUE(@PayloadJson, '$.code');
                    IF @SlvCode IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UsuarioId AND SleeveCode = @SlvCode)
                        BEGIN
                            INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt)
                            VALUES (@UsuarioId, @SlvCode, GETDATE());
                        END
                    END
                END

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @GiftType AS GiftType,
                    @PayloadJson AS PayloadJson,
                    @NewStarships AS NewStarships,
                    'Recompensa reclamada y guardada exitosamente en la base de datos.' AS Message;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        END;
    `);

    console.log('🎉 ¡Migración maestra completada con éxito!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Error en migración maestra:', err);
    process.exit(1);
});
