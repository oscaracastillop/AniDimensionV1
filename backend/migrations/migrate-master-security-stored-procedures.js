/**
 * MIGRACIÓN MAESTRA DE SEGURIDAD Y STORED PROCEDURES (FASES 1 - 6)
 * Centraliza el 100% de la economía, inventarios, mazos, buzón, VIP y cosméticos en SQL Server.
 */
const { getPool } = require('../config/db');

async function migrateMasterSecurity() {
    try {
        console.log('[MASTER MIGRATION] Iniciando creación de tablas y Stored Procedures de Seguridad...');
        const pool = await getPool();

        // =========================================================================
        // 1. VERIFICACIÓN Y CREACIÓN DE TABLAS REQUERIDAS
        // =========================================================================
        console.log('[MASTER MIGRATION] 1/6: Verificando tablas de soporte...');
        await pool.request().query(`
            -- Tabla de Transacciones de Starships si no existe con INT UserId
            IF OBJECT_ID('dbo.StarshipTransactions', 'U') IS NOT NULL AND EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'StarshipTransactions' AND COLUMN_NAME = 'UserId' AND DATA_TYPE = 'uniqueidentifier'
            )
            BEGIN
                DROP TABLE dbo.StarshipTransactions;
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StarshipTransactions')
            BEGIN
                CREATE TABLE dbo.StarshipTransactions (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UserId INT NOT NULL,
                    Amount INT NOT NULL,
                    Description NVARCHAR(255) NOT NULL,
                    TransactionType NVARCHAR(50) NOT NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
            END

            -- Columnas de cosméticos activos y VIP en dbo.Usuarios si no existen
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'AvatarActivoId')
                ALTER TABLE dbo.Usuarios ADD AvatarActivoId NVARCHAR(50) NOT NULL DEFAULT 'AVA-002';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'MatActivoId')
                ALTER TABLE dbo.Usuarios ADD MatActivoId NVARCHAR(50) NULL DEFAULT 'default_mat';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'FundaActivaId')
                ALTER TABLE dbo.Usuarios ADD FundaActivaId NVARCHAR(50) NULL DEFAULT 'default_sleeve';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'VipUntil')
                ALTER TABLE dbo.Usuarios ADD VipUntil DATETIME NULL;
        `);

        // =========================================================================
        // 2. STORED PROCEDURES DE INVENTARIO Y APERTURA DE SOBRES
        // =========================================================================
        console.log('[MASTER MIGRATION] 2/6: Creando Stored Procedures de Inventario y Sobres...');
        
        // SP: Obtener inventario de cartas del usuario
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GetUserCards
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    CardCode, 
                    SUM(Quantity) AS Quantity, 
                    MAX(FoilType) AS FoilType, 
                    MAX(AcquiredAt) AS AcquiredAt
                FROM dbo.UserCardsSql
                WHERE UsuarioId = @UsuarioId
                GROUP BY CardCode;
            END;
        `);

        // SP: Comprar y Abrir Sobre (Transaccional, descuenta Starships y añade cartas)
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarYGuardarSobre
                @UsuarioId INT,
                @PackId NVARCHAR(50),
                @Costo INT,
                @CardsJson NVARCHAR(MAX)
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar que el sobre exista y esté activo
                    DECLARE @IsActive BIT, @PackPrice INT, @PackName NVARCHAR(150);
                    SELECT @IsActive = IsActive, @PackPrice = Price, @PackName = Name
                    FROM dbo.BoosterPacks
                    WHERE PackId = @PackId;

                    IF @IsActive IS NULL OR @IsActive = 0
                    BEGIN
                        RAISERROR('El sobre solicitado no está disponible para compra.', 16, 1);
                        ROLLBACK TRANSACTION;
                        RETURN;
                    END

                    -- 2. Validar saldo de Starships del usuario
                    DECLARE @CurrentStarships BIGINT;
                    SELECT @CurrentStarships = ISNULL(Starships, 0)
                    FROM dbo.Usuarios
                    WHERE Id = @UsuarioId;

                    IF @CurrentStarships < @Costo
                    BEGIN
                        RAISERROR('Saldo insuficiente de Starships para comprar este sobre.', 16, 1);
                        ROLLBACK TRANSACTION;
                        RETURN;
                    END

                    -- 3. Descontar saldo y registrar transacción
                    UPDATE dbo.Usuarios
                    SET Starships = Starships - @Costo
                    WHERE Id = @UsuarioId;

                    INSERT INTO dbo.StarshipTransactions 
                        (UserId, Amount, Description, TransactionType, CreatedAt)
                    VALUES 
                        (@UsuarioId, -@Costo, 'Compra de sobre: ' + @PackName, 'SHOP_PURCHASE', GETDATE());

                    -- 4. Insertar / Actualizar las cartas en dbo.UserCardsSql desde el JSON (agrupadas para evitar duplicados en MERGE)
                    MERGE dbo.UserCardsSql AS target
                    USING (
                        SELECT 
                            @UsuarioId AS UsuarioId,
                            CAST(JSON_VALUE(value, '$.card_id') AS INT) AS CardCode,
                            MAX(ISNULL(JSON_VALUE(value, '$.rarity'), 'NORMAL')) AS FoilType,
                            COUNT(*) AS QuantityToAdd
                        FROM OPENJSON(@CardsJson)
                        WHERE JSON_VALUE(value, '$.card_id') IS NOT NULL
                        GROUP BY CAST(JSON_VALUE(value, '$.card_id') AS INT)
                    ) AS source
                    ON (target.UsuarioId = source.UsuarioId AND target.CardCode = source.CardCode)
                    WHEN MATCHED THEN
                        UPDATE SET target.Quantity = target.Quantity + source.QuantityToAdd
                    WHEN NOT MATCHED THEN
                        INSERT (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                        VALUES (source.UsuarioId, source.CardCode, source.QuantityToAdd, source.FoilType, GETDATE());

                    COMMIT TRANSACTION;

                    -- Devolver balance actualizado
                    SELECT 
                        1 AS Success, 
                        @CurrentStarships - @Costo AS NewStarships, 
                        'Sobre abierto y cartas agregadas al inventario con éxito.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

        // =========================================================================
        // 3. STORED PROCEDURES DE MAZOS (DECKS)
        // =========================================================================
        console.log('[MASTER MIGRATION] 3/6: Creando Stored Procedures de Mazos...');
        
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GetUserDecks
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    Id, UsuarioId, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo, FechaCreacion
                FROM dbo.Decks
                WHERE UsuarioId = @UsuarioId
                ORDER BY EsActivo DESC, Id ASC;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_SaveUserDeck
                @UsuarioId INT,
                @DeckId INT = NULL,
                @Nombre NVARCHAR(100) = 'Mazo Principal',
                @MainDeckJson NVARCHAR(MAX),
                @ExtraDeckJson NVARCHAR(MAX) = '[]',
                @SideDeckJson NVARCHAR(MAX) = '[]',
                @IsActive BIT = 1
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- Si se marca como activo, desactivar los otros mazos del usuario
                    IF @IsActive = 1
                    BEGIN
                        UPDATE dbo.Decks 
                        SET EsActivo = 0 
                        WHERE UsuarioId = @UsuarioId;
                    END

                    IF @DeckId IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.Decks WHERE Id = @DeckId AND UsuarioId = @UsuarioId)
                    BEGIN
                        UPDATE dbo.Decks
                        SET 
                            Nombre = @Nombre,
                            MainDeckJson = @MainDeckJson,
                            ExtraDeckJson = @ExtraDeckJson,
                            SideDeckJson = @SideDeckJson,
                            EsActivo = @IsActive
                        WHERE Id = @DeckId AND UsuarioId = @UsuarioId;

                        SELECT 1 AS Success, @DeckId AS DeckId, 'Mazo actualizado correctamente.' AS Message;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.Decks (UsuarioId, Nombre, MainDeckJson, ExtraDeckJson, SideDeckJson, EsActivo, FechaCreacion)
                        VALUES (@UsuarioId, @Nombre, @MainDeckJson, @ExtraDeckJson, @SideDeckJson, @IsActive, GETDATE());

                        SELECT 1 AS Success, SCOPE_IDENTITY() AS DeckId, 'Mazo guardado correctamente en la base de datos.' AS Message;
                    END

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

        // =========================================================================
        // 4. STORED PROCEDURES DE BUZÓN Y REGALOS
        // =========================================================================
        console.log('[MASTER MIGRATION] 4/6: Creando Stored Procedures de Buzón...');

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerBuzonUsuario
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    Id, UsuarioId, GiftType, Title, Description, PayloadJson, 
                    IsClaimed, ClaimedAt, CreatedAt, Sender
                FROM dbo.UserMailbox
                WHERE UsuarioId = @UsuarioId AND IsClaimed = 0
                ORDER BY CreatedAt DESC;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ReclamarRegaloBuzon
                @UsuarioId INT,
                @MailboxId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @Title NVARCHAR(150), @GiftType NVARCHAR(50), @PayloadJson NVARCHAR(MAX);
                    
                    SELECT 
                        @Title = Title,
                        @GiftType = GiftType,
                        @PayloadJson = PayloadJson
                    FROM dbo.UserMailbox
                    WHERE Id = @MailboxId AND UsuarioId = @UsuarioId AND IsClaimed = 0;

                    IF @GiftType IS NULL
                    BEGIN
                        RAISERROR('El regalo no existe o ya fue reclamado.', 16, 1);
                        ROLLBACK TRANSACTION;
                        RETURN;
                    END

                    -- Extraer cantidad y código de PayloadJson si existe
                    DECLARE @Amount INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.amount') AS INT), 0);
                    DECLARE @ItemCode NVARCHAR(50) = JSON_VALUE(@PayloadJson, '$.code');

                    IF @GiftType IN ('STARSHIPS', 'ESTRELLAS') AND @Amount > 0
                    BEGIN
                        UPDATE dbo.Usuarios 
                        SET Starships = Starships + @Amount 
                        WHERE Id = @UsuarioId;

                        INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                        VALUES (@UsuarioId, @Amount, 'Reclamo buzón: ' + @Title, 'MAILBOX_REWARD', GETDATE());
                    END
                    ELSE IF @GiftType IN ('EXP', 'EXPERIENCIA') AND @Amount > 0
                    BEGIN
                        UPDATE dbo.Usuarios 
                        SET Experiencia = Experiencia + @Amount 
                        WHERE Id = @UsuarioId;
                    END
                    ELSE IF @GiftType = 'CARD' AND @ItemCode IS NOT NULL
                    BEGIN
                        DECLARE @CardIntCode INT = TRY_CAST(@ItemCode AS INT);
                        IF @CardIntCode IS NOT NULL
                        BEGIN
                            IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @UsuarioId AND CardCode = @CardIntCode)
                                UPDATE dbo.UserCardsSql SET Quantity = Quantity + 1 WHERE UsuarioId = @UsuarioId AND CardCode = @CardIntCode;
                            ELSE
                                INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                                VALUES (@UsuarioId, @CardIntCode, 1, 'NORMAL', GETDATE());
                        END
                    END
                    ELSE IF @GiftType = 'PLAYMAT' AND @ItemCode IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UsuarioId AND PlaymatCode = @ItemCode)
                            INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt) VALUES (@UsuarioId, @ItemCode, GETDATE());
                    END
                    ELSE IF @GiftType = 'SLEEVE' AND @ItemCode IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UsuarioId AND SleeveCode = @ItemCode)
                            INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt) VALUES (@UsuarioId, @ItemCode, GETDATE());
                    END

                    -- Marcar como reclamado
                    UPDATE dbo.UserMailbox
                    SET IsClaimed = 1, ClaimedAt = GETDATE()
                    WHERE Id = @MailboxId AND UsuarioId = @UsuarioId;

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, 'Recompensa reclamada con éxito.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

        // =========================================================================
        // 5. STORED PROCEDURES DE VIP Y COSMÉTICOS (TAPETES, FUNDAS, AVATARES)
        // =========================================================================
        console.log('[MASTER MIGRATION] 5/6: Creando Stored Procedures de VIP y Cosméticos...');

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ComprarPaseVip
                @UsuarioId INT,
                @PassCode NVARCHAR(50),
                @DurationDays INT = 30,
                @CostoStarships INT = 5000
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @CurrentStarships BIGINT;
                    SELECT @CurrentStarships = ISNULL(Starships, 0)
                    FROM dbo.Usuarios
                    WHERE Id = @UsuarioId;

                    IF @CurrentStarships < @CostoStarships
                    BEGIN
                        RAISERROR('Saldo insuficiente para adquirir el Pase VIP.', 16, 1);
                        ROLLBACK TRANSACTION;
                        RETURN;
                    END

                    -- Descontar saldo
                    UPDATE dbo.Usuarios
                    SET 
                        Starships = Starships - @CostoStarships,
                        VipUntil = CASE 
                            WHEN VipUntil IS NOT NULL AND VipUntil > GETDATE() 
                            THEN DATEADD(DAY, @DurationDays, VipUntil)
                            ELSE DATEADD(DAY, @DurationDays, GETDATE())
                        END
                    WHERE Id = @UsuarioId;

                    -- Registrar compra
                    INSERT INTO dbo.UserVipPasses (UsuarioId, VipCode, ExpiresAt, AcquiredAt)
                    SELECT @UsuarioId, @PassCode, VipUntil, GETDATE()
                    FROM dbo.Usuarios WHERE Id = @UsuarioId;

                    INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                    VALUES (@UsuarioId, -@CostoStarships, 'Compra de Pase VIP ' + @PassCode, 'VIP_PURCHASE', GETDATE());

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success, 
                        VipUntil, 
                        Starships AS NewStarships, 
                        'Pase VIP adquirido exitosamente.' AS Message
                    FROM dbo.Usuarios WHERE Id = @UsuarioId;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

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

                    DECLARE @CurrentStarships BIGINT;
                    SELECT @CurrentStarships = ISNULL(Starships, 0)
                    FROM dbo.Usuarios WHERE Id = @UserId;

                    IF @CurrentStarships IS NULL
                    BEGIN
                        THROW 50030, 'Usuario no encontrado.', 1;
                    END

                    IF @CurrentStarships < @CostStarships
                    BEGIN
                        THROW 50031, 'Saldo insuficiente de StarShips.', 1;
                    END

                    -- Descontar Starships
                    IF @CostStarships > 0
                    BEGIN
                        UPDATE dbo.Usuarios SET Starships = Starships - @CostStarships WHERE Id = @UserId;

                        INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                        VALUES (@UserId, -@CostStarships, 'Compra de ' + @ItemType + ': ' + @ItemCode, 'COSMETIC_PURCHASE', GETDATE());
                    END

                    -- Insertar en tabla de propiedad según tipo
                    IF @ItemType = 'AVATAR'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ItemCode)
                            INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                            VALUES (@UserId, @ItemCode, ISNULL(@ExpBoost, 0.00), ISNULL(@StarshipsBoost, 0.00), ISNULL(@LuckBoost, 0.00), 0, GETDATE());
                        ELSE
                            UPDATE dbo.UserAvatars 
                            SET ExpBoost = ISNULL(@ExpBoost, ExpBoost),
                                StarshipsBoost = ISNULL(@StarshipsBoost, StarshipsBoost),
                                LuckBoost = ISNULL(@LuckBoost, LuckBoost)
                            WHERE UserId = @UserId AND AvatarCode = @ItemCode;
                    END
                    ELSE IF @ItemType = 'PLAYMAT'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UserId AND PlaymatCode = @ItemCode)
                            INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt) VALUES (@UserId, @ItemCode, GETDATE());
                    END
                    ELSE IF @ItemType = 'SLEEVE'
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UserId AND SleeveCode = @ItemCode)
                            INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt) VALUES (@UserId, @ItemCode, GETDATE());
                    END

                    DECLARE @NewBalance BIGINT;
                    SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success, @NewBalance AS NewStarshipsBalance, 'Artículo adquirido correctamente.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

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
                        UPDATE dbo.Usuarios SET AvatarActivoId = 'AVA-002' WHERE Id = @UserId;
                        UPDATE dbo.UserAvatars SET IsActive = 0 WHERE UserId = @UserId;
                        SELECT 1 AS Success, 'Avatar por defecto equipado.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres propietario de este avatar.' AS Message;
                        RETURN;
                    END

                    UPDATE dbo.Usuarios SET AvatarActivoId = @ItemCode WHERE Id = @UserId;
                    UPDATE dbo.UserAvatars SET IsActive = CASE WHEN AvatarCode = @ItemCode THEN 1 ELSE 0 END WHERE UserId = @UserId;
                    SELECT 1 AS Success, 'Avatar equipado exitosamente.' AS Message;
                    RETURN;
                END
                ELSE IF @ItemType = 'PLAYMAT'
                BEGIN
                    IF @ItemCode IS NULL OR @ItemCode = '' OR @ItemCode = 'NONE' OR @ItemCode = 'DEFAULT' OR @ItemCode = 'null'
                    BEGIN
                        UPDATE dbo.Usuarios SET MatActivoId = NULL WHERE Id = @UserId;
                        SELECT 1 AS Success, 'Tapete removido.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UserId AND PlaymatCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres propietario de este tapete.' AS Message;
                        RETURN;
                    END

                    UPDATE dbo.Usuarios SET MatActivoId = @ItemCode WHERE Id = @UserId;
                    SELECT 1 AS Success, 'Tapete equipado exitosamente.' AS Message;
                    RETURN;
                END
                ELSE IF @ItemType = 'SLEEVE'
                BEGIN
                    IF @ItemCode IS NULL OR @ItemCode = '' OR @ItemCode = 'NONE' OR @ItemCode = 'DEFAULT' OR @ItemCode = 'null'
                    BEGIN
                        UPDATE dbo.Usuarios SET FundaActivaId = NULL WHERE Id = @UserId;
                        SELECT 1 AS Success, 'Funda removida.' AS Message;
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UserId AND SleeveCode = @ItemCode)
                    BEGIN
                        SELECT 0 AS Success, 'No eres propietario de esta funda.' AS Message;
                        RETURN;
                    END

                    UPDATE dbo.Usuarios SET FundaActivaId = @ItemCode WHERE Id = @UserId;
                    SELECT 1 AS Success, 'Funda equipada exitosamente.' AS Message;
                    RETURN;
                END

                SELECT 0 AS Success, 'Tipo de cosmético no reconocido.' AS Message;
            END;
        `);

        // =========================================================================
        // 6. STORED PROCEDURES DE COSMÉTICOS Y MEJORAS DE AVATAR
        // =========================================================================
        console.log('[MASTER MIGRATION] 6/6: Creando Stored Procedures de Perfil y Mejoras...');

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_GetUserCosmetics
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                
                -- Avatares
                SELECT AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt
                FROM dbo.UserAvatars
                WHERE UserId = @UsuarioId;

                -- Tapetes
                SELECT PlaymatCode AS MatCode, AcquiredAt AS UnlockedAt
                FROM dbo.UserPlaymats
                WHERE UsuarioId = @UsuarioId;

                -- Fundas
                SELECT SleeveCode, AcquiredAt AS UnlockedAt
                FROM dbo.UserSleeves
                WHERE UsuarioId = @UsuarioId;

                -- Cosméticos Activos y VIP
                SELECT 
                    AvatarActivoId, MatActivoId, FundaActivaId, VipUntil,
                    CASE WHEN VipUntil IS NOT NULL AND VipUntil > GETDATE() THEN 1 ELSE 0 END AS IsVipActive
                FROM dbo.Usuarios
                WHERE Id = @UsuarioId;
            END;
        `);

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_MejorarAvatar
                @UsuarioId INT,
                @AvatarCode NVARCHAR(50),
                @Stat NVARCHAR(50), -- 'EXP', 'STARSHIPS', 'LUCK'
                @CostStarships INT
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @CurrentStarships BIGINT;
                    SELECT @CurrentStarships = ISNULL(Starships, 0)
                    FROM dbo.Usuarios WHERE Id = @UsuarioId;

                    IF @CurrentStarships < @CostStarships
                    BEGIN
                        RAISERROR('Saldo insuficiente de Starships para mejorar el avatar.', 16, 1);
                        ROLLBACK TRANSACTION;
                        RETURN;
                    END

                    -- Asegurar que el usuario tenga el avatar
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode)
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                        VALUES (@UsuarioId, @AvatarCode, 0, 0, 0, 0, GETDATE());
                    END

                    -- Descontar Starships
                    UPDATE dbo.Usuarios SET Starships = Starships - @CostStarships WHERE Id = @UsuarioId;

                    INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                    VALUES (@UsuarioId, -@CostStarships, 'Mejora de avatar ' + @AvatarCode + ' stat: ' + @Stat, 'AVATAR_UPGRADE', GETDATE());

                    -- Aplicar mejora
                    IF @Stat = 'EXP'
                        UPDATE dbo.UserAvatars SET ExpBoost = ExpBoost + 1 WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode;
                    ELSE IF @Stat = 'STARSHIPS'
                        UPDATE dbo.UserAvatars SET StarshipsBoost = StarshipsBoost + 1 WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode;
                    ELSE IF @Stat = 'LUCK'
                        UPDATE dbo.UserAvatars SET LuckBoost = LuckBoost + 1 WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        AvatarCode, ExpBoost, StarshipsBoost, LuckBoost,
                        @CurrentStarships - @CostStarships AS NewStarships,
                        'Avatar mejorado exitosamente.' AS Message
                    FROM dbo.UserAvatars
                    WHERE UserId = @UsuarioId AND AvatarCode = @AvatarCode;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

        console.log('[MASTER MIGRATION EXITOSA] Todos los Procedimientos Almacenados y tablas han sido creados y verificados.');
        process.exit(0);
    } catch (err) {
        console.error('[MASTER MIGRATION ERROR]', err);
        process.exit(1);
    }
}

migrateMasterSecurity();
