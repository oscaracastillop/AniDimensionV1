const { getPool, sql } = require('../config/db');

async function fixMailboxAndBoosters() {
    try {
        console.log('⚡ Conectando a SQL Server...');
        const pool = await getPool();

        // 1. Asegurar tabla dbo.UserMailbox
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserMailbox')
            BEGIN
                CREATE TABLE dbo.UserMailbox (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NULL,
                    GiftType NVARCHAR(50) NOT NULL,
                    Title NVARCHAR(150) NOT NULL,
                    Description NVARCHAR(500) NULL,
                    PayloadJson NVARCHAR(MAX) NOT NULL,
                    IsClaimed BIT NOT NULL DEFAULT 0,
                    ClaimedAt DATETIME NULL,
                    Sender NVARCHAR(100) NOT NULL DEFAULT 'Administración Ani-Dimension',
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
            END
        `);

        // 2. Migrar compras huérfanas de dbo.BuzonRecompensas a dbo.UserMailbox
        console.log('⚡ Migrando ítems no consumidos de BuzonRecompensas a UserMailbox...');
        await pool.request().query(`
            INSERT INTO dbo.UserMailbox (
                UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed, Sender, CreatedAt
            )
            SELECT 
                br.UsuarioId,
                CASE 
                    WHEN br.ItemType = 'CARD' THEN 'CARD'
                    ELSE 'POTENCIADOR'
                END AS GiftType,
                br.ItemName,
                CASE 
                    WHEN br.Source IS NOT NULL THEN br.Source
                    ELSE 'Potenciador adquirido en la Tienda Oficial'
                END AS Description,
                CONCAT(
                    '{"code":"', br.ItemCode, 
                    '","name":"', REPLACE(br.ItemName, '"', '\"'), 
                    '","type":"', br.ItemType, 
                    '","boost_value":', CAST(br.BoostValue AS VARCHAR(10)), 
                    ',"value":', CAST(br.BoostValue AS VARCHAR(10)), 
                    ',"amount":1}'
                ) AS PayloadJson,
                0 AS IsClaimed,
                ISNULL(br.Source, 'Tienda de Potenciadores') AS Sender,
                br.CreatedAt
            FROM dbo.BuzonRecompensas br
            WHERE br.IsConsumed = 0
            AND NOT EXISTS (
                SELECT 1 FROM dbo.UserMailbox um 
                WHERE um.UsuarioId = br.UsuarioId 
                AND um.Title = br.ItemName 
                AND um.IsClaimed = 0
            );
        `);

        // 3. Actualizar dbo.sp_ComprarPotenciador
        console.log('⚡ Actualizando stored procedure dbo.sp_ComprarPotenciador...');
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

                    -- 1. Validar existencia de usuario y saldo de StarShips
                    DECLARE @Stars BIGINT;
                    SELECT @Stars = Starships FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK) WHERE Id = @UserId;

                    IF @Stars IS NULL
                    BEGIN
                        THROW 50040, 'Usuario no encontrado en la base de datos.', 1;
                    END

                    IF @Stars < @CostStarships
                    BEGIN
                        THROW 50041, 'Saldo insuficiente de StarShips para realizar la compra.', 1;
                    END

                    -- 2. Descontar StarShips
                    UPDATE dbo.Usuarios 
                    SET Starships = Starships - @CostStarships 
                    WHERE Id = @UserId;

                    -- 3. Insertar en dbo.UserMailbox (Buzón oficial consultado por el perfil)
                    DECLARE @CleanName NVARCHAR(150) = REPLACE(@ItemName, '"', '\"');
                    DECLARE @Payload NVARCHAR(MAX) = CONCAT(
                        '{"code":"', @ItemCode, 
                        '","name":"', @CleanName, 
                        '","type":"', @ItemType, 
                        '","boost_value":', CAST(@BoostValue AS VARCHAR(10)), 
                        ',"value":', CAST(@BoostValue AS VARCHAR(10)), 
                        ',"amount":1}'
                    );

                    INSERT INTO dbo.UserMailbox (
                        UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed, Sender, CreatedAt
                    )
                    VALUES (
                        @UserId, 
                        'POTENCIADOR', 
                        @ItemName, 
                        'Potenciador adquirido en la Tienda Oficial', 
                        @Payload, 
                        0, 
                        'Tienda de Potenciadores', 
                        GETDATE()
                    );

                    -- 4. Registrar en BuzonRecompensas (para auditoría e histórico)
                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
                    BEGIN
                        INSERT INTO dbo.BuzonRecompensas (
                            UsuarioId, ItemCode, ItemName, ItemType, BoostValue, Source, IsConsumed, CreatedAt
                        )
                        VALUES (
                            @UserId, 
                            @ItemCode, 
                            @ItemName, 
                            @ItemType, 
                            @BoostValue, 
                            'Tienda de Potenciadores', 
                            0, 
                            GETDATE()
                        );
                    END

                    -- 5. Registrar en StarshipTransactions (Auditoría contable)
                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'StarshipTransactions')
                    BEGIN
                        INSERT INTO dbo.StarshipTransactions (
                            UserId, Amount, Description, TransactionType, CreatedAt
                        )
                        VALUES (
                            @UserId, 
                            -@CostStarships, 
                            CONCAT('Compra de potenciador: ', @ItemName), 
                            'SHOP_PURCHASE', 
                            GETDATE()
                        );
                    END

                    -- 6. Obtener saldo actualizado
                    DECLARE @NewB BIGINT;
                    SELECT @NewB = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success, 
                        @NewB AS NewStarshipsBalance, 
                        'Potenciador adquirido con éxito y enviado a tu Buzón Oficial.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 50042, @ErrMsg, 1;
                END CATCH
            END
        `);

        // 4. Actualizar dbo.sp_FinalizarSubasta
        console.log('⚡ Actualizando stored procedure dbo.sp_FinalizarSubasta...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_FinalizarSubasta
                @SubastaId INT,
                @Forced BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @Status VARCHAR(20), @EndsAt DATETIME, @WinnerId INT, @WinnerName NVARCHAR(100), @WinningPrice INT;
                    DECLARE @CardCode INT, @CardName NVARCHAR(255);

                    SELECT 
                        @Status = Status,
                        @EndsAt = EndsAt,
                        @WinnerId = HighestBidderId,
                        @WinnerName = HighestBidderUsername,
                        @WinningPrice = CurrentPrice,
                        @CardCode = CardCode,
                        @CardName = CardName
                    FROM dbo.EventosSubasta WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = @SubastaId;

                    IF @Status IS NULL
                    BEGIN
                        THROW 51010, 'Subasta no encontrada.', 1;
                    END

                    IF @Status = 'ACTIVE' AND (@Forced = 1 OR GETDATE() >= @EndsAt)
                    BEGIN
                        UPDATE dbo.EventosSubasta
                        SET Status = 'FINISHED'
                        WHERE Id = @SubastaId;

                        IF @WinnerId IS NOT NULL
                        BEGIN
                            -- Marcar puja como WON
                            UPDATE dbo.SubastaPujas 
                            SET Status = 'WON' 
                            WHERE SubastaId = @SubastaId AND Status = 'HELD';

                            -- Entregar carta en el Buzón Oficial (dbo.UserMailbox)
                            DECLARE @CleanCardName NVARCHAR(255) = REPLACE(@CardName, '"', '\"');
                            DECLARE @CardPayload NVARCHAR(MAX) = CONCAT(
                                '{"cardId":', CAST(@CardCode AS VARCHAR(20)), 
                                ',"cardName":"', @CleanCardName, 
                                '","copies":1,"rarity":"ULTRA_RARE","foil_type":"NORMAL"}'
                            );

                            INSERT INTO dbo.UserMailbox (
                                UsuarioId, GiftType, Title, Description, PayloadJson, IsClaimed, Sender, CreatedAt
                            ) VALUES (
                                @WinnerId,
                                'CARD',
                                @CardName,
                                CONCAT('Carta ganada en la Subasta #', @SubastaId),
                                @CardPayload,
                                0,
                                'Subasta Ani-Dimension',
                                GETDATE()
                            );

                            -- Entregar también en BuzonRecompensas para auditoría
                            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
                            BEGIN
                                INSERT INTO dbo.BuzonRecompensas (
                                    UsuarioId, ItemCode, ItemName, ItemType, BoostValue, Source, IsConsumed, CreatedAt
                                ) VALUES (
                                    @WinnerId, 
                                    'CARD-' + CAST(@CardCode AS VARCHAR(20)), 
                                    @CardName, 
                                    'CARD', 
                                    0, 
                                    'Subasta Finalizada #' + CAST(@SubastaId AS VARCHAR(10)), 
                                    0, 
                                    GETDATE()
                                );
                            END
                        END
                    END

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success, 'Subasta finalizada correctamente.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsgSubasta NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 51012, @ErrMsgSubasta, 1;
                END CATCH
            END
        `);

        // 5. Actualizar dbo.sp_ReclamarRegaloBuzon para aplicar potenciadores a dbo.AvatarStats
        console.log('⚡ Actualizando stored procedure dbo.sp_ReclamarRegaloBuzon...');
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

                    -- Variables de retorno
                    DECLARE @NewStarships BIGINT = NULL;
                    DECLARE @UpdatedExp DECIMAL(5,2) = NULL;
                    DECLARE @UpdatedStar DECIMAL(5,2) = NULL;
                    DECLARE @UpdatedLuck DECIMAL(5,2) = NULL;

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

                    -- 4. POTENCIADOR (ACTIVA EL BOOST EN dbo.AvatarStats)
                    ELSE IF @GiftType = 'POTENCIADOR'
                    BEGIN
                        DECLARE @PotCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'POT-001');
                        DECLARE @PotType VARCHAR(50) = UPPER(ISNULL(JSON_VALUE(@PayloadJson, '$.type'), 'EXP'));
                        DECLARE @PotBoost DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.boost_value') AS DECIMAL(5,2)), 0.00);
                        IF @PotBoost = 0.00
                            SET @PotBoost = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.value') AS DECIMAL(5,2)), 1.00);

                        -- Asegurar fila en dbo.AvatarStats
                        IF NOT EXISTS (SELECT 1 FROM dbo.AvatarStats WHERE UsuarioId = @UsuarioId)
                        BEGIN
                            INSERT INTO dbo.AvatarStats (UsuarioId, BonusExp, BonusStarships, BonusSuerte)
                            VALUES (@UsuarioId, 0.0, 0.0, 0.0);
                        END

                        -- Aplicar respetando topes máximos (EXP 300%, StarShips 300%, Suerte 100%)
                        IF @PotType IN ('SUERTE', 'LUCK')
                        BEGIN
                            UPDATE dbo.AvatarStats 
                            SET BonusSuerte = CASE WHEN (BonusSuerte + @PotBoost) > 100.00 THEN 100.00 ELSE BonusSuerte + @PotBoost END
                            WHERE UsuarioId = @UsuarioId;
                        END
                        ELSE IF @PotType IN ('STARSHIPS', 'STAR')
                        BEGIN
                            UPDATE dbo.AvatarStats 
                            SET BonusStarships = CASE WHEN (BonusStarships + @PotBoost) > 300.00 THEN 300.00 ELSE BonusStarships + @PotBoost END
                            WHERE UsuarioId = @UsuarioId;
                        END
                        ELSE -- EXP
                        BEGIN
                            UPDATE dbo.AvatarStats 
                            SET BonusExp = CASE WHEN (BonusExp + @PotBoost) > 300.00 THEN 300.00 ELSE BonusExp + @PotBoost END
                            WHERE UsuarioId = @UsuarioId;
                        END

                        -- Actualizar histórico en BuzonRecompensas si existe
                        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
                        BEGIN
                            UPDATE dbo.BuzonRecompensas 
                            SET IsConsumed = 1, ConsumedAt = GETDATE()
                            WHERE UsuarioId = @UsuarioId AND ItemCode = @PotCode AND IsConsumed = 0;
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

                    -- Obtener estadísticas actualizadas de AvatarStats
                    SELECT 
                        @UpdatedExp = ISNULL(BonusExp, 0.0),
                        @UpdatedStar = ISNULL(BonusStarships, 0.0),
                        @UpdatedLuck = ISNULL(BonusSuerte, 0.0)
                    FROM dbo.AvatarStats 
                    WHERE UsuarioId = @UsuarioId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        @GiftType AS GiftType,
                        @PayloadJson AS PayloadJson,
                        @NewStarships AS NewStarships,
                        @UpdatedExp AS BonusExp,
                        @UpdatedStar AS BonusStarships,
                        @UpdatedLuck AS BonusSuerte,
                        'Recompensa reclamada y aplicada exitosamente a tu cuenta.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;
        `);

        console.log('✅ Migración y actualización de SPs completada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en script de actualización:', err);
        process.exit(1);
    }
}

fixMailboxAndBoosters();
