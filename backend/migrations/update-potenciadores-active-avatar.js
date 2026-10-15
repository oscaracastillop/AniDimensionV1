const { getPool, sql } = require('../config/db');

async function updatePotenciadoresActiveAvatar() {
    try {
        console.log('⚡ Conectando a SQL Server para migración de potenciadores en avatar activo...');
        const pool = await getPool();

        // 1. Asegurar tabla transaccional dbo.UserAvatarPotenciadores
        console.log('⚡ Verificando tabla dbo.UserAvatarPotenciadores...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserAvatarPotenciadores')
            BEGIN
                CREATE TABLE dbo.UserAvatarPotenciadores (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UserId INT NOT NULL,
                    AvatarCode VARCHAR(50) NOT NULL,
                    PotenciadorCode VARCHAR(50) NOT NULL,
                    PotenciadorName NVARCHAR(150) NOT NULL,
                    BoostType VARCHAR(50) NOT NULL,
                    BoostValue DECIMAL(5,2) NOT NULL,
                    AppliedAt DATETIME NOT NULL DEFAULT GETDATE()
                );
            END
        `);

        // 2. Actualizar dbo.sp_ReclamarRegaloBuzon
        console.log('⚡ Actualizando dbo.sp_ReclamarRegaloBuzon para aplicar al avatar activo...');
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
            RAISERROR('El regalo especificado no existe en el buzón.', 16, 1);
            RETURN;
        END

        -- Validar si es regalo individual o global
        IF @GiftTargetUserId IS NOT NULL
        BEGIN
            IF @GiftTargetUserId <> @UsuarioId
            BEGIN
                RAISERROR('Este regalo no pertenece a tu cuenta de duelista.', 16, 1);
                RETURN;
            END
            IF @IsClaimed = 1
            BEGIN
                RAISERROR('Este regalo ya fue reclamado previamente.', 16, 1);
                RETURN;
            END
        END
        ELSE
        BEGIN
            -- Regalo GLOBAL
            IF EXISTS (SELECT 1 FROM dbo.UserMailboxGlobalClaims WHERE MailboxGiftId = @MailboxId AND UsuarioId = @UsuarioId)
            BEGIN
                RAISERROR('Ya has reclamado previamente este regalo global.', 16, 1);
                RETURN;
            END

            INSERT INTO dbo.UserMailboxGlobalClaims (MailboxGiftId, UsuarioId, ClaimedAt)
            VALUES (@MailboxId, @UsuarioId, GETDATE());
        END

        -- Variables de retorno y seguimiento
        DECLARE @NewStarships BIGINT = NULL;
        DECLARE @ActiveAvatarCode VARCHAR(50) = 'AVA-002';
        DECLARE @ActiveAvatarId INT = NULL;
        DECLARE @AvatarExp DECIMAL(5,2) = 0.00;
        DECLARE @AvatarStar DECIMAL(5,2) = 0.00;
        DECLARE @AvatarLuck DECIMAL(5,2) = 0.00;
        DECLARE @SuccessMessage NVARCHAR(500) = '';

        -- =====================================================================
        -- 1. STARSHIPS / ESTRELLAS
        -- =====================================================================
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
            ELSE
            BEGIN
                SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;
            END

            SET @SuccessMessage = CONCAT('¡Has recibido +', FORMAT(@StarAmt, '#,0'), ' StarShips en tu cuenta! Tu nuevo balance es de ', FORMAT(@NewStarships, '#,0'), ' ⭐.');
        END

        -- =====================================================================
        -- 2. EXP / EXPERIENCIA
        -- =====================================================================
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

            SET @SuccessMessage = CONCAT('¡Has recibido +', FORMAT(@ExpAmt, '#,0'), ' puntos de Experiencia en tu cuenta de duelista!');
        END

        -- =====================================================================
        -- 3. AVATAR
        -- =====================================================================
        ELSE IF @GiftType = 'AVATAR'
        BEGIN
            DECLARE @GiftAvatarCode VARCHAR(50) = COALESCE(
                JSON_VALUE(@PayloadJson, '$.code'),
                JSON_VALUE(@PayloadJson, '$.avatar_code'),
                JSON_VALUE(@PayloadJson, '$.image_code'),
                JSON_VALUE(@PayloadJson, '$.avatarId'),
                'AVA-002'
            );
            DECLARE @GiftAvatarName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), @GiftAvatarCode);
            DECLARE @GiftAvatarExp DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.exp_boost') AS DECIMAL(5,2)), 0.00);
            DECLARE @GiftAvatarStar DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.starships_boost') AS DECIMAL(5,2)), 0.00);
            DECLARE @GiftAvatarLuck DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.luck_boost') AS DECIMAL(5,2)), 0.00);

            IF @GiftAvatarExp = 0.00 AND @GiftAvatarStar = 0.00 AND @GiftAvatarLuck = 0.00 AND EXISTS (SELECT * FROM sys.tables WHERE name = 'AvatarsCatalog')
            BEGIN
                SELECT 
                    @GiftAvatarExp = ExpBoost,
                    @GiftAvatarStar = StarshipsBoost,
                    @GiftAvatarLuck = LuckBoost
                FROM dbo.AvatarsCatalog
                WHERE Code = @GiftAvatarCode;
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UsuarioId AND AvatarCode = @GiftAvatarCode)
            BEGIN
                INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                VALUES (@UsuarioId, @GiftAvatarCode, @GiftAvatarExp, @GiftAvatarStar, @GiftAvatarLuck, 0, GETDATE());
            END
            ELSE
            BEGIN
                UPDATE dbo.UserAvatars 
                SET ExpBoost = CASE WHEN @GiftAvatarExp > ExpBoost THEN @GiftAvatarExp ELSE ExpBoost END,
                    StarshipsBoost = CASE WHEN @GiftAvatarStar > StarshipsBoost THEN @GiftAvatarStar ELSE StarshipsBoost END,
                    LuckBoost = CASE WHEN @GiftAvatarLuck > LuckBoost THEN @GiftAvatarLuck ELSE LuckBoost END
                WHERE UserId = @UsuarioId AND AvatarCode = @GiftAvatarCode;
            END

            SET @SuccessMessage = CONCAT('¡Has desbloqueado el avatar "', @GiftAvatarName, '" [', @GiftAvatarCode, '] (+', CAST(@GiftAvatarExp AS VARCHAR(10)), '% EXP, +', CAST(@GiftAvatarStar AS VARCHAR(10)), '% ⭐, +', CAST(@GiftAvatarLuck AS VARCHAR(10)), '% 🍀) en tu colección!');
        END

        -- =====================================================================
        -- 4. POTENCIADOR: SE APLICA AL AVATAR ACTIVO DEL USUARIO
        -- =====================================================================
        ELSE IF @GiftType = 'POTENCIADOR'
        BEGIN
            DECLARE @PotCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'POT-001');
            DECLARE @PotName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), @Title);
            DECLARE @PotType VARCHAR(50) = UPPER(ISNULL(JSON_VALUE(@PayloadJson, '$.type'), 'EXP'));
            DECLARE @PotBoost DECIMAL(5,2) = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.boost_value') AS DECIMAL(5,2)), 0.00);
            IF @PotBoost = 0.00
                SET @PotBoost = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.value') AS DECIMAL(5,2)), 1.00);

            -- A. Determinar avatar activo del usuario
            SELECT @ActiveAvatarCode = ISNULL(AvatarActivoId, 'AVA-002') 
            FROM dbo.Usuarios 
            WHERE Id = @UsuarioId;

            IF @ActiveAvatarCode IS NULL SET @ActiveAvatarCode = 'AVA-002';

            -- B. Asegurar que exista registro para este avatar en dbo.UserAvatars
            IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UsuarioId AND AvatarCode = @ActiveAvatarCode)
            BEGIN
                DECLARE @InitExp DECIMAL(5,2) = 0.0, @InitStar DECIMAL(5,2) = 0.0, @InitLuck DECIMAL(5,2) = 0.0;
                IF EXISTS (SELECT 1 FROM dbo.AvatarsCatalog WHERE Code = @ActiveAvatarCode)
                BEGIN
                    SELECT @InitExp = ISNULL(ExpBoost, 0.0), @InitStar = ISNULL(StarshipsBoost, 0.0), @InitLuck = ISNULL(LuckBoost, 0.0)
                    FROM dbo.AvatarsCatalog WHERE Code = @ActiveAvatarCode;
                END
                ELSE IF @ActiveAvatarCode = 'AVA-001'
                BEGIN
                    SET @InitExp = 5.0; SET @InitStar = 5.0; SET @InitLuck = 3.0;
                END

                INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                VALUES (@UsuarioId, @ActiveAvatarCode, @InitExp, @InitStar, @InitLuck, 1, GETDATE());
            END

            -- C. Obtener ID y estadísticas actuales del avatar activo
            SELECT 
                @ActiveAvatarId = Id,
                @AvatarExp = ISNULL(ExpBoost, 0.00),
                @AvatarStar = ISNULL(StarshipsBoost, 0.00),
                @AvatarLuck = ISNULL(LuckBoost, 0.00)
            FROM dbo.UserAvatars
            WHERE UserId = @UsuarioId AND AvatarCode = @ActiveAvatarCode;

            -- D. VALIDAR TOPES MÁXIMOS
            IF @PotType = 'EXP'
            BEGIN
                DECLARE @MaxExp DECIMAL(5,2) = 300.00;
                IF @AvatarExp >= @MaxExp
                BEGIN
                    RAISERROR('Tu avatar activo ya ha alcanzado el límite máximo de 300.0% de EXP.', 16, 1);
                    RETURN;
                END

                IF (@AvatarExp + @PotBoost) > @MaxExp
                BEGIN
                    DECLARE @MissingExp DECIMAL(5,2) = @MaxExp - @AvatarExp;
                    DECLARE @ErrMsgExp NVARCHAR(500);
                    SET @ErrMsgExp = CONCAT('No se puede aplicar este potenciador (+', CAST(@PotBoost AS VARCHAR(10)), '%). Superaría el tope de 300.0% de EXP. Tu avatar activo (', @ActiveAvatarCode, ') tiene ', CAST(@AvatarExp AS VARCHAR(10)), '% y solo le falta exactamente +', CAST(@MissingExp AS VARCHAR(10)), '% para completarlo.');
                    RAISERROR('%s', 16, 1, @ErrMsgExp);
                    RETURN;
                END

                UPDATE dbo.UserAvatars SET ExpBoost = ExpBoost + @PotBoost WHERE Id = @ActiveAvatarId;
                SET @AvatarExp = @AvatarExp + @PotBoost;
            END
            ELSE IF @PotType IN ('STARSHIPS', 'ESTRELLAS')
            BEGIN
                DECLARE @MaxStar DECIMAL(5,2) = 300.00;
                IF @AvatarStar >= @MaxStar
                BEGIN
                    RAISERROR('Tu avatar activo ya ha alcanzado el límite máximo de 300.0% de StarShips.', 16, 1);
                    RETURN;
                END

                IF (@AvatarStar + @PotBoost) > @MaxStar
                BEGIN
                    DECLARE @MissingStar DECIMAL(5,2) = @MaxStar - @AvatarStar;
                    DECLARE @ErrMsgStar NVARCHAR(500);
                    SET @ErrMsgStar = CONCAT('No se puede aplicar este potenciador (+', CAST(@PotBoost AS VARCHAR(10)), '%). Superaría el tope de 300.0% de StarShips. Tu avatar activo (', @ActiveAvatarCode, ') tiene ', CAST(@AvatarStar AS VARCHAR(10)), '% y solo le falta exactamente +', CAST(@MissingStar AS VARCHAR(10)), '% para completarlo.');
                    RAISERROR('%s', 16, 1, @ErrMsgStar);
                    RETURN;
                END

                UPDATE dbo.UserAvatars SET StarshipsBoost = StarshipsBoost + @PotBoost WHERE Id = @ActiveAvatarId;
                SET @AvatarStar = @AvatarStar + @PotBoost;
            END
            ELSE IF @PotType IN ('SUERTE', 'LUCK')
            BEGIN
                DECLARE @MaxLuck DECIMAL(5,2) = 100.00;
                IF @AvatarLuck >= @MaxLuck
                BEGIN
                    RAISERROR('Tu avatar activo ya ha alcanzado el límite máximo de 100.0% de Suerte.', 16, 1);
                    RETURN;
                END

                IF (@AvatarLuck + @PotBoost) > @MaxLuck
                BEGIN
                    DECLARE @MissingLuck DECIMAL(5,2) = @MaxLuck - @AvatarLuck;
                    DECLARE @ErrMsgLuck NVARCHAR(500);
                    SET @ErrMsgLuck = CONCAT('No se puede aplicar este potenciador (+', CAST(@PotBoost AS VARCHAR(10)), '%). Superaría el tope de 100.0% de Suerte. Tu avatar activo (', @ActiveAvatarCode, ') tiene ', CAST(@AvatarLuck AS VARCHAR(10)), '% y solo le falta exactamente +', CAST(@MissingLuck AS VARCHAR(10)), '% para completarlo.');
                    RAISERROR('%s', 16, 1, @ErrMsgLuck);
                    RETURN;
                END

                UPDATE dbo.UserAvatars SET LuckBoost = LuckBoost + @PotBoost WHERE Id = @ActiveAvatarId;
                SET @AvatarLuck = @AvatarLuck + @PotBoost;
            END

            -- E. Registrar en tabla transaccional hija dbo.UserAvatarPotenciadores
            INSERT INTO dbo.UserAvatarPotenciadores (
                UserId, AvatarCode, PotenciadorCode, PotenciadorName, BoostType, BoostValue, AppliedAt
            ) VALUES (
                @UsuarioId, @ActiveAvatarCode, @PotCode, @PotName, @PotType, @PotBoost, GETDATE()
            );

            -- F. Sincronizar en dbo.AvatarStats
            IF NOT EXISTS (SELECT 1 FROM dbo.AvatarStats WHERE UsuarioId = @UsuarioId)
            BEGIN
                INSERT INTO dbo.AvatarStats (UsuarioId, BonusExp, BonusStarships, BonusSuerte)
                VALUES (@UsuarioId, @AvatarExp, @AvatarStar, @AvatarLuck);
            END
            ELSE
            BEGIN
                UPDATE dbo.AvatarStats 
                SET BonusExp = @AvatarExp,
                    BonusStarships = @AvatarStar,
                    BonusSuerte = @AvatarLuck
                WHERE UsuarioId = @UsuarioId;
            END

            -- G. Actualizar histórico en BuzonRecompensas si existe
            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'BuzonRecompensas')
            BEGIN
                UPDATE dbo.BuzonRecompensas 
                SET IsConsumed = 1, ConsumedAt = GETDATE()
                WHERE UsuarioId = @UsuarioId AND ItemCode = @PotCode AND IsConsumed = 0;
            END

            SET @SuccessMessage = CONCAT('¡Potenciador ', @PotName, ' (+', CAST(@PotBoost AS VARCHAR(10)), '% ', @PotType, ') aplicado exitosamente a tu avatar activo [', @ActiveAvatarCode, ']!');
        END

        -- =====================================================================
        -- 5. PASE VIP
        -- =====================================================================
        ELSE IF @GiftType = 'VIP'
        BEGIN
            DECLARE @VipCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'VIP-004');
            DECLARE @VipName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), 'Membresía VIP');
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

            SET @SuccessMessage = CONCAT('¡Membresía VIP "', @VipName, '" activada con éxito por ', CAST(@VipDays AS VARCHAR(10)), ' días en tu cuenta!');
        END

        -- =====================================================================
        -- 6. CARTA OCG (CARD)
        -- =====================================================================
        ELSE IF @GiftType = 'CARD'
        BEGIN
            DECLARE @CardId INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.cardId') AS INT), 0);
            IF @CardId = 0
                SET @CardId = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.code') AS INT), 0);
            DECLARE @CardCopies INT = ISNULL(TRY_CAST(JSON_VALUE(@PayloadJson, '$.copies') AS INT), 1);
            IF @CardCopies <= 0 SET @CardCopies = 1;
            DECLARE @CardNameClaimed NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.cardName'), CONCAT('Carta #', CAST(@CardId AS VARCHAR(20))));
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

            SET @SuccessMessage = CONCAT('¡Has recibido ', CAST(@CardCopies AS VARCHAR(10)), 'x ', @CardNameClaimed, ' (#', CAST(@CardId AS VARCHAR(20)), ') agregada a tu inventario y baúl de cartas!');
        END

        -- =====================================================================
        -- 7. TAPETE (PLAYMAT)
        -- =====================================================================
        ELSE IF @GiftType = 'PLAYMAT'
        BEGIN
            DECLARE @MatCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'MAT-001');
            DECLARE @MatName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), 'Tapete de Duelo');
            IF @MatCode IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UsuarioId AND PlaymatCode = @MatCode)
                BEGIN
                    INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt)
                    VALUES (@UsuarioId, @MatCode, GETDATE());
                END
            END

            SET @SuccessMessage = CONCAT('¡Has desbloqueado el tapete de duelo "', @MatName, '" [', @MatCode, '] en tu colección!');
        END

        -- =====================================================================
        -- 8. FUNDA (SLEEVE)
        -- =====================================================================
        ELSE IF @GiftType = 'SLEEVE'
        BEGIN
            DECLARE @SlvCode VARCHAR(50) = ISNULL(JSON_VALUE(@PayloadJson, '$.code'), 'SLV-001');
            DECLARE @SlvName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), 'Funda Especial');
            IF @SlvCode IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UsuarioId AND SleeveCode = @SlvCode)
                BEGIN
                    INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt)
                    VALUES (@UsuarioId, @SlvCode, GETDATE());
                END
            END

            SET @SuccessMessage = CONCAT('¡Has desbloqueado la funda para cartas "', @SlvName, '" [', @SlvCode, '] en tu colección!');
        END

        -- =====================================================================
        -- 9. MEDALLA (MEDAL)
        -- =====================================================================
        ELSE IF @GiftType = 'MEDAL'
        BEGIN
            DECLARE @MedName NVARCHAR(150) = ISNULL(JSON_VALUE(@PayloadJson, '$.name'), 'Medalla Honorífica');
            SET @SuccessMessage = CONCAT('¡Has recibido la medalla honorífica "', @MedName, '"!');
        END

        -- =====================================================================
        -- 10. FALLBACK OTRO TIPO
        -- =====================================================================
        ELSE
        BEGIN
            SET @SuccessMessage = CONCAT('¡Recompensa "', ISNULL(@Title, 'Premio'), '" reclamada exitosamente!');
        END

        -- Marcar como reclamado en UserMailbox si es individual
        IF @GiftTargetUserId IS NOT NULL
        BEGIN
            UPDATE dbo.UserMailbox 
            SET IsClaimed = 1, ClaimedAt = GETDATE() 
            WHERE Id = @MailboxId;
        END

        -- Obtener estadísticas finales del avatar activo
        SELECT 
            @ActiveAvatarCode = ISNULL(u.AvatarActivoId, 'AVA-002'),
            @AvatarExp = ISNULL(ua.ExpBoost, 0.0),
            @AvatarStar = ISNULL(ua.StarshipsBoost, 0.0),
            @AvatarLuck = ISNULL(ua.LuckBoost, 0.0)
        FROM dbo.Usuarios u
        LEFT JOIN dbo.UserAvatars ua ON u.Id = ua.UserId AND u.AvatarActivoId = ua.AvatarCode
        WHERE u.Id = @UsuarioId;

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @GiftType AS GiftType,
            @PayloadJson AS PayloadJson,
            @NewStarships AS NewStarships,
            @ActiveAvatarCode AS ActiveAvatarCode,
            @AvatarExp AS AvatarExp,
            @AvatarStar AS AvatarStar,
            @AvatarLuck AS AvatarLuck,
            @AvatarExp AS BonusExp,
            @AvatarStar AS BonusStarships,
            @AvatarLuck AS BonusSuerte,
            @SuccessMessage AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR('%s', 16, 1, @ErrorMsg);
    END CATCH
END;
        `);

        // 3. Actualizar dbo.sp_ConsumirPotenciadorBuzon
        console.log('⚡ Actualizando dbo.sp_ConsumirPotenciadorBuzon...');
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

                    DECLARE @ItemCode VARCHAR(50), @ItemName NVARCHAR(150), @ItemType VARCHAR(50), @BoostValue DECIMAL(5,2), @IsConsumed BIT;
                    SELECT 
                        @ItemCode = ItemCode,
                        @ItemName = ItemName,
                        @ItemType = UPPER(ItemType),
                        @BoostValue = BoostValue,
                        @IsConsumed = IsConsumed
                    FROM dbo.BuzonRecompensas
                    WHERE Id = @BuzonItemId AND UsuarioId = @UserId;

                    IF @ItemType IS NULL
                    BEGIN
                        RAISERROR('%s', 16, 1, 'El ítem no existe en tu buzón.');
                        RETURN;
                    END

                    IF @IsConsumed = 1
                    BEGIN
                        RAISERROR('%s', 16, 1, 'Este ítem ya ha sido consumido previamente.');
                        RETURN;
                    END

                    -- A. Avatar activo
                    DECLARE @ActiveAvatarCode VARCHAR(50);
                    SELECT @ActiveAvatarCode = ISNULL(AvatarActivoId, 'AVA-002') FROM dbo.Usuarios WHERE Id = @UserId;
                    IF @ActiveAvatarCode IS NULL SET @ActiveAvatarCode = 'AVA-002';

                    -- B. Asegurar UserAvatars
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ActiveAvatarCode)
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                        VALUES (@UserId, @ActiveAvatarCode, 0, 0, 0, 1, GETDATE());
                    END

                    DECLARE @UserAvatarId INT, @CurExp DECIMAL(5,2), @CurStar DECIMAL(5,2), @CurLuck DECIMAL(5,2);
                    SELECT 
                        @UserAvatarId = Id,
                        @CurExp = ISNULL(ExpBoost, 0),
                        @CurStar = ISNULL(StarshipsBoost, 0),
                        @CurLuck = ISNULL(LuckBoost, 0)
                    FROM dbo.UserAvatars
                    WHERE UserId = @UserId AND AvatarCode = @ActiveAvatarCode;

                    -- C. Validar topes y valor faltante exacto
                    IF @ItemType = 'EXP'
                    BEGIN
                        IF @CurExp >= 300.00
                        BEGIN
                            RAISERROR('%s', 16, 1, 'Tu avatar activo ya ha alcanzado el límite máximo de 300.0% de EXP.');
                            RETURN;
                        END
                        IF (@CurExp + @BoostValue) > 300.00
                        BEGIN
                            DECLARE @MissE DECIMAL(5,2) = 300.00 - @CurExp;
                            DECLARE @ErrE NVARCHAR(500) = CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 300.0% de EXP. Al avatar activo le falta exactamente +', CAST(@MissE AS VARCHAR(10)), '%.');
                            RAISERROR('%s', 16, 1, @ErrE);
                            RETURN;
                        END
                        UPDATE dbo.UserAvatars SET ExpBoost = ExpBoost + @BoostValue WHERE Id = @UserAvatarId;
                        SET @CurExp = @CurExp + @BoostValue;
                    END
                    ELSE IF @ItemType IN ('STARSHIPS', 'STAR', 'ESTRELLAS')
                    BEGIN
                        IF @CurStar >= 300.00
                        BEGIN
                            RAISERROR('%s', 16, 1, 'Tu avatar activo ya ha alcanzado el límite máximo de 300.0% de StarShips.');
                            RETURN;
                        END
                        IF (@CurStar + @BoostValue) > 300.00
                        BEGIN
                            DECLARE @MissS DECIMAL(5,2) = 300.00 - @CurStar;
                            DECLARE @ErrS NVARCHAR(500) = CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 300.0% de StarShips. Al avatar activo le falta exactamente +', CAST(@MissS AS VARCHAR(10)), '%.');
                            RAISERROR('%s', 16, 1, @ErrS);
                            RETURN;
                        END
                        UPDATE dbo.UserAvatars SET StarshipsBoost = StarshipsBoost + @BoostValue WHERE Id = @UserAvatarId;
                        SET @CurStar = @CurStar + @BoostValue;
                    END
                    ELSE IF @ItemType IN ('SUERTE', 'LUCK')
                    BEGIN
                        IF @CurLuck >= 100.00
                        BEGIN
                            RAISERROR('%s', 16, 1, 'Tu avatar activo ya ha alcanzado el límite máximo de 100.0% de Suerte.');
                            RETURN;
                        END
                        IF (@CurLuck + @BoostValue) > 100.00
                        BEGIN
                            DECLARE @MissL DECIMAL(5,2) = 100.00 - @CurLuck;
                            DECLARE @ErrL NVARCHAR(500) = CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 100.0% de Suerte. Al avatar activo le falta exactamente +', CAST(@MissL AS VARCHAR(10)), '%.');
                            RAISERROR('%s', 16, 1, @ErrL);
                            RETURN;
                        END
                        UPDATE dbo.UserAvatars SET LuckBoost = LuckBoost + @BoostValue WHERE Id = @UserAvatarId;
                        SET @CurLuck = @CurLuck + @BoostValue;
                    END

                    -- D. Marcar consumido e insertar detalle
                    UPDATE dbo.BuzonRecompensas SET IsConsumed = 1, ConsumedAt = GETDATE() WHERE Id = @BuzonItemId;

                    INSERT INTO dbo.UserAvatarPotenciadores (UserId, AvatarCode, PotenciadorCode, PotenciadorName, BoostType, BoostValue, AppliedAt)
                    VALUES (@UserId, @ActiveAvatarCode, @ItemCode, @ItemName, @ItemType, @BoostValue, GETDATE());

                    -- Sincronizar AvatarStats
                    UPDATE dbo.AvatarStats 
                    SET BonusExp = @CurExp, BonusStarships = @CurStar, BonusSuerte = @CurLuck
                    WHERE UsuarioId = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        @ActiveAvatarCode AS ActiveAvatarCode,
                        @CurExp AS BonusExp,
                        @CurStar AS BonusStarships,
                        @CurLuck AS BonusSuerte,
                        'Potenciador aplicado con éxito al avatar activo ' + @ActiveAvatarCode + '.' AS Message;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                    RAISERROR('%s', 16, 1, @ErrMsg);
                END CATCH
            END;
        `);

        console.log('✅ Procedimientos actualizados con éxito con RAISERROR %s.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en actualización:', err);
        process.exit(1);
    }
}

updatePotenciadoresActiveAvatar();
