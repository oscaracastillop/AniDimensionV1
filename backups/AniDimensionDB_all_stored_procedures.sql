-- =====================================================================
-- ANI-DIMENSION: COLECCIÓN MAESTRA DE 84 PROCEDIMIENTOS ALMACENADOS
-- Base de datos: AniDimensionDB | Generado: 2026-10-13T21:12:04.443Z
-- =====================================================================
USE [AniDimensionDB];
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_AbandonarClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_AbandonarClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_AbandonarClan];
GO
CREATE   PROCEDURE dbo.sp_AbandonarClan
    @ClanId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Role VARCHAR(20);
    SELECT @Role = Role FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @UserId;

    IF @Role IS NULL
    BEGIN
        SELECT 0 AS Success, 'No perteneces a este clan.' AS Message;
        RETURN;
    END

    IF @Role = 'Lider'
    BEGIN
        DECLARE @TotalMembers INT;
        SELECT @TotalMembers = COUNT(1) FROM dbo.ClanMembers WHERE ClanId = @ClanId;

        IF @TotalMembers > 1
        BEGIN
            SELECT 0 AS Success, 
                   'Como LÃ­der, debes transferir el liderazgo a otro miembro antes de abandonar el clan, o disolver el clan si deseas eliminarlo por completo.' AS Message;
            RETURN;
        END
        ELSE
        BEGIN
            BEGIN TRANSACTION;
            BEGIN TRY
                DELETE FROM dbo.Clans WHERE Id = @ClanId;

                UPDATE dbo.Usuarios 
                SET ClanCooldownUntil = DATEADD(HOUR, 24, GETDATE())
                WHERE Id = @UserId;

                COMMIT TRANSACTION;
                SELECT 1 AS Success, 
                       'Has abandonado y disuelto el clan. Se ha aplicado una penalizaciÃ³n de espera de 24 horas antes de poder fundar o unirte a otro clan.' AS Message;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
            END CATCH
            RETURN;
        END
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @UserId;

        UPDATE dbo.Usuarios 
        SET ClanCooldownUntil = DATEADD(HOUR, 24, GETDATE())
        WHERE Id = @UserId;

        COMMIT TRANSACTION;
        SELECT 1 AS Success, 
               'Has abandonado el clan exitosamente. Se ha aplicado una penalizaciÃ³n de espera de 24 horas antes de poder fundar o unirte a otro clan.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ActualizarConfigClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ActualizarConfigClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ActualizarConfigClan];
GO
CREATE   PROCEDURE dbo.sp_ActualizarConfigClan
    @ClanId INT,
    @AdminUserId INT,
    @NoticeMessage NVARCHAR(500) = NULL,
    @MinLevelReq INT = NULL,
    @Tag VARCHAR(6) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AdminRole VARCHAR(20);
    SELECT @AdminRole = Role FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @AdminUserId;

    IF @AdminRole IS NULL OR (@AdminRole <> 'Lider' AND @AdminRole <> 'Colider')
    BEGIN
        SELECT 0 AS Success, 'No tienes permisos para modificar la configuraciÃ³n del clan.' AS Message;
        RETURN;
    END

    UPDATE dbo.Clans
    SET 
        NoticeMessage = ISNULL(@NoticeMessage, NoticeMessage),
        MinLevelReq = ISNULL(@MinLevelReq, MinLevelReq),
        Tag = ISNULL(@Tag, Tag)
    WHERE Id = @ClanId;

    SELECT 1 AS Success, 'ConfiguraciÃ³n del clan actualizada correctamente.' AS Message;
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_AplicarPotenciadorAvatar]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_AplicarPotenciadorAvatar]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_AplicarPotenciadorAvatar];
GO

            CREATE   PROCEDURE dbo.sp_AplicarPotenciadorAvatar
                @UserId INT,
                @AvatarCode VARCHAR(50),
                @PotenciadorCode VARCHAR(50)
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar que el usuario posea el avatar
                    DECLARE @UserAvatarId INT = NULL;
                    DECLARE @CurrentExpBoost DECIMAL(5,2) = 0;
                    DECLARE @CurrentStarshipsBoost DECIMAL(5,2) = 0;
                    DECLARE @CurrentLuckBoost DECIMAL(5,2) = 0;

                    SELECT @UserAvatarId = Id,
                           @CurrentExpBoost = ISNULL(ExpBoost, 0),
                           @CurrentStarshipsBoost = ISNULL(StarshipsBoost, 0),
                           @CurrentLuckBoost = ISNULL(LuckBoost, 0)
                    FROM dbo.UserAvatars WITH (UPDLOCK)
                    WHERE UserId = @UserId AND AvatarCode = @AvatarCode;

                    IF @UserAvatarId IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        SELECT 0 AS Success, 'No posees este avatar para aplicarle un potenciador.' AS Message;
                        RETURN;
                    END

                    -- 2. Validar potenciador en catálogo
                    DECLARE @PotName NVARCHAR(150);
                    DECLARE @PotType VARCHAR(50);
                    DECLARE @BoostValue DECIMAL(5,2);
                    DECLARE @CostStarships INT;

                    SELECT @PotName = Name,
                           @PotType = UPPER(Type),
                           @BoostValue = ISNULL(BoostValue, 0),
                           @CostStarships = ISNULL(PriceStarships, 0)
                    FROM dbo.PotenciadoresCatalog
                    WHERE Code = @PotenciadorCode AND IsActive = 1;

                    IF @PotName IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        SELECT 0 AS Success, 'El potenciador especificado no existe o no está activo.' AS Message;
                        RETURN;
                    END

                    -- 3. Validar topes máximos y valor faltante exacto
                    IF @PotType = 'EXP'
                    BEGIN
                        IF @CurrentExpBoost >= 300.00
                        BEGIN
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, 'El avatar ya posee el límite máximo de 300.0% de EXP.' AS Message;
                            RETURN;
                        END
                        IF (@CurrentExpBoost + @BoostValue) > 300.00
                        BEGIN
                            DECLARE @RemExp DECIMAL(5,2) = 300.00 - @CurrentExpBoost;
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 300.0% de EXP. Al avatar le falta exactamente +', CAST(@RemExp AS VARCHAR(10)), '%.') AS Message;
                            RETURN;
                        END
                    END
                    ELSE IF @PotType IN ('STARSHIPS', 'STAR', 'ESTRELLAS')
                    BEGIN
                        IF @CurrentStarshipsBoost >= 300.00
                        BEGIN
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, 'El avatar ya posee el límite máximo de 300.0% de StarShips.' AS Message;
                            RETURN;
                        END
                        IF (@CurrentStarshipsBoost + @BoostValue) > 300.00
                        BEGIN
                            DECLARE @RemStar DECIMAL(5,2) = 300.00 - @CurrentStarshipsBoost;
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 300.0% de StarShips. Al avatar le falta exactamente +', CAST(@RemStar AS VARCHAR(10)), '%.') AS Message;
                            RETURN;
                        END
                    END
                    ELSE IF @PotType IN ('SUERTE', 'LUCK')
                    BEGIN
                        IF @CurrentLuckBoost >= 100.00
                        BEGIN
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, 'El avatar ya posee el límite máximo de 100.0% de Suerte.' AS Message;
                            RETURN;
                        END
                        IF (@CurrentLuckBoost + @BoostValue) > 100.00
                        BEGIN
                            DECLARE @RemLuck DECIMAL(5,2) = 100.00 - @CurrentLuckBoost;
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, CONCAT('No se puede aplicar este potenciador (+', CAST(@BoostValue AS VARCHAR(10)), '%). Superaría el tope de 100.0% de Suerte. Al avatar le falta exactamente +', CAST(@RemLuck AS VARCHAR(10)), '%.') AS Message;
                            RETURN;
                        END
                    END

                    -- 4. Validar y descontar saldo de Starships si tiene costo
                    DECLARE @CurrentStarships INT = 0;
                    SELECT @CurrentStarships = Starships
                    FROM dbo.Usuarios WITH (UPDLOCK)
                    WHERE Id = @UserId;

                    IF @CurrentStarships < @CostStarships
                    BEGIN
                        ROLLBACK TRANSACTION;
                        SELECT 0 AS Success, 'Saldo insuficiente de Starships para adquirir este potenciador.' AS Message;
                        RETURN;
                    END

                    IF @CostStarships > 0
                    BEGIN
                        UPDATE dbo.Usuarios
                        SET Starships = Starships - @CostStarships
                        WHERE Id = @UserId;

                        INSERT INTO dbo.StarshipTransactions (UserId, Amount, TransactionType, Description, CreatedAt)
                        VALUES (@UserId, -@CostStarships, 'BOOSTER_AVATAR', 'Potenciador ' + @PotName + ' aplicado a avatar ' + @AvatarCode, GETDATE());
                    END

                    -- 5. Insertar en tabla hija dbo.UserAvatarPotenciadores
                    INSERT INTO dbo.UserAvatarPotenciadores (UserId, AvatarCode, PotenciadorCode, PotenciadorName, BoostType, BoostValue, AppliedAt)
                    VALUES (@UserId, @AvatarCode, @PotenciadorCode, @PotName, @PotType, @BoostValue, GETDATE());

                    -- 6. Actualizar estadísticas acumuladas en dbo.UserAvatars
                    IF @PotType = 'EXP'
                        SET @CurrentExpBoost = @CurrentExpBoost + @BoostValue;
                    ELSE IF @PotType IN ('STARSHIPS', 'STAR', 'ESTRELLAS')
                        SET @CurrentStarshipsBoost = @CurrentStarshipsBoost + @BoostValue;
                    ELSE IF @PotType IN ('SUERTE', 'LUCK')
                        SET @CurrentLuckBoost = @CurrentLuckBoost + @BoostValue;

                    UPDATE dbo.UserAvatars
                    SET ExpBoost = @CurrentExpBoost,
                        StarshipsBoost = @CurrentStarshipsBoost,
                        LuckBoost = @CurrentLuckBoost
                    WHERE Id = @UserAvatarId;

                    -- Sincronizar AvatarStats si el avatar es el activo
                    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Id = @UserId AND AvatarActivoId = @AvatarCode)
                    BEGIN
                        UPDATE dbo.AvatarStats
                        SET BonusExp = @CurrentExpBoost,
                            BonusStarships = @CurrentStarshipsBoost,
                            BonusSuerte = @CurrentLuckBoost
                        WHERE UsuarioId = @UserId;
                    END

                    -- Obtener saldo actualizado
                    DECLARE @NewStarships INT;
                    SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UserId;

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success,
                           'Potenciador ' + @PotName + ' aplicado con éxito al avatar ' + @AvatarCode + '.' AS Message,
                           @AvatarCode AS AvatarCode,
                           @CurrentExpBoost AS ExpBoost,
                           @CurrentStarshipsBoost AS StarshipsBoost,
                           @CurrentLuckBoost AS LuckBoost,
                           @NewStarships AS NewStarshipsBalance;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
                END CATCH
            END;
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_AutenticarUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_AutenticarUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_AutenticarUsuario];
GO

            CREATE   PROCEDURE dbo.sp_AutenticarUsuario
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CambiarRolClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CambiarRolClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CambiarRolClan];
GO
CREATE   PROCEDURE dbo.sp_CambiarRolClan
    @ClanId INT,
    @LeaderUserId INT,
    @TargetUserId INT,
    @NewRole VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LeaderCheck INT;
    SELECT @LeaderCheck = LeaderUserId FROM dbo.Clans WHERE Id = @ClanId;

    IF @LeaderCheck IS NULL OR @LeaderCheck <> @LeaderUserId
    BEGIN
        SELECT 0 AS Success, 'Solo el LÃ­der Fundador puede cambiar rangos en el clan.' AS Message;
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @TargetUserId)
    BEGIN
        SELECT 0 AS Success, 'El usuario objetivo no pertenece al clan.' AS Message;
        RETURN;
    END

    IF @NewRole = 'Lider'
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            UPDATE dbo.Clans SET LeaderUserId = @TargetUserId WHERE Id = @ClanId;
            UPDATE dbo.ClanMembers SET Role = 'Colider' WHERE ClanId = @ClanId AND UserId = @LeaderUserId;
            UPDATE dbo.ClanMembers SET Role = 'Lider' WHERE ClanId = @ClanId AND UserId = @TargetUserId;
            COMMIT TRANSACTION;
            SELECT 1 AS Success, 'Liderazgo del clan transferido exitosamente.' AS Message;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
        END CATCH
    END
    ELSE
    BEGIN
        UPDATE dbo.ClanMembers SET Role = @NewRole WHERE ClanId = @ClanId AND UserId = @TargetUserId;
        SELECT 1 AS Success, 'Rango del miembro actualizado a "' + @NewRole + '".' AS Message;
    END
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CancelarSubasta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CancelarSubasta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CancelarSubasta];
GO
CREATE   PROCEDURE dbo.sp_CancelarSubasta
                @SubastaId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @Status VARCHAR(20), @WinnerId INT, @WinningPrice INT;
                    SELECT @Status = Status, @WinnerId = HighestBidderId, @WinningPrice = CurrentPrice
                    FROM dbo.EventosSubasta WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = @SubastaId;

                    IF @Status = 'ACTIVE'
                    BEGIN
                        -- Reintegrar estrellas retenidas al postor actual si hubo pujas
                        IF @WinnerId IS NOT NULL
                        BEGIN
                            UPDATE dbo.Usuarios 
                            SET Starships = Starships + @WinningPrice 
                            WHERE Id = @WinnerId;

                            UPDATE dbo.SubastaPujas 
                            SET Status = 'CANCELLED' 
                            WHERE SubastaId = @SubastaId AND Status = 'HELD';
                        END

                        UPDATE dbo.EventosSubasta 
                        SET Status = 'CANCELLED' 
                        WHERE Id = @SubastaId;
                    END

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, 'Subasta cancelada y estrellas devueltas si aplicaba.' AS Message;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrCanc NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 51012, @ErrCanc, 1;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CanjearFichasSobrantesPuzzle]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CanjearFichasSobrantesPuzzle]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CanjearFichasSobrantesPuzzle];
GO

CREATE   PROCEDURE dbo.sp_CanjearFichasSobrantesPuzzle
    @EventId INT,
    @UserId INT,
    @PiecesExchanged INT,
    @StarshipsAwarded INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.Events_Puzzle_Exchanges WHERE event_id = @EventId AND user_id = @UserId)
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Ya has realizado el canje de fichas para este evento.' AS Message, 0 AS NewStarshipsBalance;
            RETURN;
        END

        INSERT INTO dbo.Events_Puzzle_Exchanges (event_id, user_id, pieces_exchanged, starships_awarded, exchanged_at)
        VALUES (@EventId, @UserId, @PiecesExchanged, @StarshipsAwarded, SYSUTCDATETIME());

        -- Acreditar Starships en dbo.Usuarios
        UPDATE dbo.Usuarios 
        SET Starships = ISNULL(Starships, 0) + @StarshipsAwarded 
        WHERE Id = @UserId;

        DECLARE @NewBal BIGINT;
        SELECT @NewBal = Starships FROM dbo.Usuarios WHERE Id = @UserId;

        COMMIT TRANSACTION;
        SELECT 1 AS Success, 'Fichas canjeadas y Starships acreditadas exitosamente.' AS Message, @NewBal AS NewStarshipsBalance;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS NewStarshipsBalance;
    END CATCH
END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CerrarSesion]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CerrarSesion]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CerrarSesion];
GO

            CREATE   PROCEDURE dbo.sp_CerrarSesion
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CompletarRompecabezas]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CompletarRompecabezas]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CompletarRompecabezas];
GO

CREATE   PROCEDURE dbo.sp_CompletarRompecabezas
    @EventId INT,
    @UserId INT,
    @Username NVARCHAR(100),
    @PrizeData NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.Events_Puzzle_Winners WHERE event_id = @EventId AND user_id = @UserId)
        BEGIN
            DECLARE @ExistingPos INT;
            SELECT @ExistingPos = position FROM dbo.Events_Puzzle_Winners WHERE event_id = @EventId AND user_id = @UserId;
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Ya has completado este rompecabezas previamente (Puesto #' + CAST(@ExistingPos AS VARCHAR) + ').' AS Message, @ExistingPos AS Position;
            RETURN;
        END

        DECLARE @NextPos INT;
        SELECT @NextPos = COUNT(1) + 1 FROM dbo.Events_Puzzle_Winners WHERE event_id = @EventId;

        INSERT INTO dbo.Events_Puzzle_Winners (event_id, user_id, username, position, completed_at, prize_data, delivered)
        VALUES (@EventId, @UserId, @Username, @NextPos, SYSUTCDATETIME(), @PrizeData, 0);

        COMMIT TRANSACTION;
        SELECT 1 AS Success, '¡Rompecabezas completado exitosamente!' AS Message, @NextPos AS Position;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS Position;
    END CATCH
END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarAbrirSobre]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarAbrirSobre]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarAbrirSobre];
GO

            CREATE   PROCEDURE dbo.sp_ComprarAbrirSobre
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarCartaSingle]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarCartaSingle]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarCartaSingle];
GO
CREATE   PROCEDURE dbo.sp_ComprarCartaSingle
                @UsuarioId INT,
                @CardCode VARCHAR(50),
                @CardName NVARCHAR(150) = NULL,
                @PriceUsd DECIMAL(10, 2) = 0.00,
                @PriceStarships INT = 0,
                @PaymentMethod VARCHAR(50) = 'STARSHIPS',
                @FoilType VARCHAR(50) = 'NORMAL',
                @Quantity INT = 1
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Validar usuario
                    DECLARE @CurrentStarships INT;
                    SELECT @CurrentStarships = Starships 
                    FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = @UsuarioId;

                    IF @CurrentStarships IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        SELECT 0 AS Success, 'Usuario no encontrado en el sistema.' AS Message, 0 AS NewStarshipsBalance;
                        RETURN;
                    END

                    -- 2. Validar saldo si el mÃ©todo de pago es STARSHIPS
                    IF UPPER(@PaymentMethod) = 'STARSHIPS' AND @PriceStarships > 0
                    BEGIN
                        IF @CurrentStarships < @PriceStarships
                        BEGIN
                            ROLLBACK TRANSACTION;
                            SELECT 0 AS Success, 
                                   CONCAT('Saldo insuficiente de Starships (Requiere: ', @PriceStarships, ', Tienes: ', @CurrentStarships, ').') AS Message,
                                   @CurrentStarships AS NewStarshipsBalance;
                            RETURN;
                        END

                        -- Descontar Starships
                        UPDATE dbo.Usuarios 
                        SET Starships = Starships - @PriceStarships
                        WHERE Id = @UsuarioId;
                    END

                    DECLARE @NewStarships INT;
                    SELECT @NewStarships = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                    -- 3. Entregar carta a dbo.UserCardsSql (Insertar o Incrementar cantidad)
                    IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode)
                    BEGIN
                        UPDATE dbo.UserCardsSql
                        SET Quantity = Quantity + @Quantity
                        WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                        VALUES (@UsuarioId, @CardCode, @Quantity, @FoilType, GETDATE());
                    END

                    -- 4. Registrar auditorÃ­a en dbo.UserSinglePurchases
                    INSERT INTO dbo.UserSinglePurchases (
                        UsuarioId,
                        CardCode,
                        CardName,
                        PriceUsd,
                        PriceStarships,
                        PaymentMethod,
                        FoilType,
                        Quantity,
                        StarshipsBalanceBefore,
                        StarshipsBalanceAfter,
                        PurchasedAt
                    )
                    VALUES (
                        @UsuarioId,
                        @CardCode,
                        @CardName,
                        @PriceUsd,
                        @PriceStarships,
                        UPPER(@PaymentMethod),
                        @FoilType,
                        @Quantity,
                        @CurrentStarships,
                        @NewStarships,
                        GETDATE()
                    );

                    DECLARE @PurchaseId INT = SCOPE_IDENTITY();

                    COMMIT TRANSACTION;

                    SELECT 1 AS Success, 
                           'Â¡Compra realizada con Ã©xito! La carta ha sido agregada a tu inventario.' AS Message,
                           @NewStarships AS NewStarshipsBalance,
                           @PurchaseId AS PurchaseId;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS NewStarshipsBalance;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarCosmetico]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarCosmetico]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarCosmetico];
GO

        CREATE   PROCEDURE dbo.sp_ComprarCosmetico
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
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarPaseVip]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarPaseVip]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarPaseVip];
GO

            CREATE   PROCEDURE dbo.sp_ComprarPaseVip
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarPotenciador]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarPotenciador]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarPotenciador];
GO

        CREATE PROCEDURE dbo.sp_ComprarPotenciador
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

                -- 3. Insertar en dbo.UserMailbox
                DECLARE @CleanName NVARCHAR(150) = REPLACE(@ItemName, '"', '"');
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

                DECLARE @NewMailboxId INT = SCOPE_IDENTITY();

                -- 4. Registrar en BuzonRecompensas
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

                -- 5. Registrar en StarshipTransactions
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
                    @NewMailboxId AS MailboxId,
                    @NewB AS NewStarshipsBalance, 
                    'Potenciador adquirido con éxito y enviado a tu Buzón Oficial.' AS Message;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 50042, @ErrMsg, 1;
            END CATCH
        END
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ComprarYGuardarSobre]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ComprarYGuardarSobre]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ComprarYGuardarSobre];
GO

            CREATE   PROCEDURE dbo.sp_ComprarYGuardarSobre
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ConsumirPotenciadorBuzon]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ConsumirPotenciadorBuzon]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ConsumirPotenciadorBuzon];
GO

            CREATE   PROCEDURE dbo.sp_ConsumirPotenciadorBuzon
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CrearClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CrearClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CrearClan];
GO
CREATE   PROCEDURE dbo.sp_CrearClan
    @UserId INT,
    @Name VARCHAR(20),
    @Tag VARCHAR(6) = NULL,
    @EmblemUrl NVARCHAR(300),
    @MinLevelReq INT = 1,
    @NoticeMessage NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentStars BIGINT, @Cooldown DATETIME;
    SELECT @CurrentStars = ISNULL(Starships, 0), @Cooldown = ClanCooldownUntil
    FROM dbo.Usuarios WHERE Id = @UserId;

    IF @CurrentStars IS NULL
    BEGIN
        SELECT 0 AS Success, 'Usuario no encontrado.' AS Message, 0 AS ClanId, 0 AS RemainingStarships;
        RETURN;
    END

    IF @Cooldown IS NOT NULL AND @Cooldown > GETDATE()
    BEGIN
        DECLARE @MinsLeft INT = DATEDIFF(MINUTE, GETDATE(), @Cooldown);
        DECLARE @H INT = @MinsLeft / 60;
        DECLARE @M INT = @MinsLeft % 60;
        SELECT 0 AS Success, 
               'Tienes una penalizaciÃ³n activa por retiro de clan. PodrÃ¡s fundar o unirte a un clan en ' + CAST(@H AS VARCHAR) + 'h ' + CAST(@M AS VARCHAR) + 'm.' AS Message,
               0 AS ClanId, @CurrentStars AS RemainingStarships;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.ClanMembers WHERE UserId = @UserId)
    BEGIN
        SELECT 0 AS Success, 'Ya perteneces a un clan. Debes abandonarlo antes de fundar uno nuevo.' AS Message, 0 AS ClanId, @CurrentStars AS RemainingStarships;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Clans WHERE LOWER(Name) = LOWER(@Name))
    BEGIN
        SELECT 0 AS Success, 'Ese nombre de clan ya estÃ¡ registrado. Por favor elige otro.' AS Message, 0 AS ClanId, @CurrentStars AS RemainingStarships;
        RETURN;
    END

    IF @CurrentStars < 50000
    BEGIN
        SELECT 0 AS Success, 
               'StarShips insuficientes. Se requieren 50,000 StarShips para fundar un Clan.' AS Message,
               0 AS ClanId, @CurrentStars AS RemainingStarships;
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE dbo.Usuarios
        SET Starships = Starships - 50000
        WHERE Id = @UserId;

        INSERT INTO dbo.Clans (
            Name, Tag, EmblemUrl, LeaderUserId, Level, Exp, NextLevelExp, 
            MinLevelReq, NoticeMessage, MaxMembers, Trophies, CreatedAt, IsActive
        )
        VALUES (
            @Name, @Tag, @EmblemUrl, @UserId, 1, 0, 1000, 
            @MinLevelReq, ISNULL(@NoticeMessage, 'Â¡Bienvenidos al clan oficial!'), 30, 0, GETDATE(), 1
        );

        DECLARE @NewClanId INT = SCOPE_IDENTITY();

        INSERT INTO dbo.ClanMembers (ClanId, UserId, Role, ContributedExp, JoinedAt)
        VALUES (@NewClanId, @UserId, 'Lider', 0, GETDATE());

        DELETE FROM dbo.ClanJoinRequests WHERE UserId = @UserId;

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            'Â¡Clan "' + @Name + '" fundado exitosamente! Se han descontado 50,000 StarShips.' AS Message,
            @NewClanId AS ClanId,
            (@CurrentStars - 50000) AS RemainingStarships;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS ClanId, @CurrentStars AS RemainingStarships;
    END CATCH
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CrearSubasta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CrearSubasta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CrearSubasta];
GO
CREATE   PROCEDURE dbo.sp_CrearSubasta
            @CardCode INT,
            @CardName NVARCHAR(255),
            @CardRarity NVARCHAR(50),
            @CardType NVARCHAR(100),
            @ImageUrl NVARCHAR(500),
            @InitialPrice INT,
            @MinBidIncrement INT,
            @DurationMinutes INT,
            @CreatedBy NVARCHAR(100)
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @StartsAt DATETIME = GETDATE();
                DECLARE @EndsAt DATETIME = DATEADD(MINUTE, @DurationMinutes, @StartsAt);

                INSERT INTO dbo.EventosSubasta (
                    CardCode, CardName, CardRarity, CardType, ImageUrl,
                    InitialPrice, MinBidIncrement, CurrentPrice,
                    Status, StartsAt, EndsAt, CreatedAt, CreatedBy
                ) VALUES (
                    @CardCode, @CardName, @CardRarity, @CardType, @ImageUrl,
                    @InitialPrice, @MinBidIncrement, @InitialPrice,
                    'ACTIVE', @StartsAt, @EndsAt, GETDATE(), @CreatedBy
                );

                DECLARE @NewId INT = SCOPE_IDENTITY();

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @NewId AS SubastaId,
                    'Subasta creada exitosamente.' AS Message;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51000, @Err, 1;
            END CATCH
        END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_CrearTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_CrearTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CrearTorneo];
GO
CREATE   PROCEDURE dbo.sp_CrearTorneo
                @Titulo NVARCHAR(150),
                @Descripcion NVARCHAR(MAX) = NULL,
                @BannerUrl NVARCHAR(500) = NULL,
                @Formato NVARCHAR(50) = 'BO1',
                @MaxParticipantes INT = 8,
                @NivelMinimo INT = 1,
                @NivelMaximo INT = 500,
                @CostoInscripcion INT = 0,
                @TextoPremios NVARCHAR(MAX) = NULL,
                @FechaInicioInscripcion DATETIME2 = NULL,
                @FechaCierreInscripcion DATETIME2 = NULL,
                @FechaInicioTorneo DATETIME2 = NULL,
                @HorariosRondasJson NVARCHAR(MAX) = NULL,
                @CreadoPor NVARCHAR(50) = 'Admin'
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    INSERT INTO dbo.Torneos (
                        Titulo, Descripcion, BannerUrl, Formato, MaxParticipantes,
                        NivelMinimo, NivelMaximo, CostoInscripcion, TextoPremios,
                        FechaInicioInscripcion, FechaCierreInscripcion, FechaInicioTorneo,
                        HorariosRondasJson, CreadoPor, Estado, RondaActual, PremiosEntregados, CreatedAt
                    )
                    VALUES (
                        @Titulo, @Descripcion, @BannerUrl, @Formato, @MaxParticipantes,
                        @NivelMinimo, @NivelMaximo, @CostoInscripcion, @TextoPremios,
                        @FechaInicioInscripcion, @FechaCierreInscripcion, @FechaInicioTorneo,
                        @HorariosRondasJson, @CreadoPor, 'REGISTRO', 0, 0, GETDATE()
                    );

                    SELECT SCOPE_IDENTITY() AS TorneoId;
                END TRY
                BEGIN CATCH
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_DeactivateAllEvents]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_DeactivateAllEvents]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_DeactivateAllEvents];
GO
CREATE   PROCEDURE dbo.sp_DeactivateAllEvents
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE dbo.Torneos SET Estado = 'FINALIZADO' WHERE Estado IN ('REGISTRO', 'EN_CURSO');
                UPDATE dbo.EventosSubasta SET Status = 'FINISHED' WHERE Status = 'ACTIVE';
                
                SELECT @@ROWCOUNT AS ImpactedRows;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_DesconectarUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_DesconectarUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_DesconectarUsuario];
GO
CREATE   PROCEDURE dbo.sp_DesconectarUsuario
                @Username VARCHAR(50) = NULL,
                @UserId INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                UPDATE dbo.Usuarios
                SET IsOnline = 0,
                    ActiveSessionToken = NULL
                WHERE (@UserId IS NOT NULL AND Id = @UserId)
                   OR (@Username IS NOT NULL AND LOWER(Username) = LOWER(@Username));

                SELECT 1 AS Success, 'Usuario desconectado.' AS Message;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_DesinscribirJugadorTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_DesinscribirJugadorTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_DesinscribirJugadorTorneo];
GO
CREATE   PROCEDURE dbo.sp_DesinscribirJugadorTorneo
                @TorneoId INT,
                @UserId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                BEGIN TRY
                    DECLARE @Estado NVARCHAR(30), @Costo INT;
                    SELECT @Estado = Estado, @Costo = ISNULL(CostoInscripcion, 0) FROM dbo.Torneos WHERE Id = @TorneoId;

                    IF @Estado <> 'REGISTRO'
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('No puedes cancelar tu inscripciÃ³n una vez cerrado el registro.', 16, 1);
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId AND UserId = @UserId)
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('No estÃ¡s inscrito en este torneo.', 16, 1);
                        RETURN;
                    END

                    DELETE FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId AND UserId = @UserId;

                    -- Reembolso
                    IF @Costo > 0
                    BEGIN
                        UPDATE dbo.Usuarios
                        SET Starships = Starships + @Costo
                        WHERE Id = @UserId;
                    END

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_DisolverClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_DisolverClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_DisolverClan];
GO
CREATE   PROCEDURE dbo.sp_DisolverClan
    @ClanId INT,
    @LeaderUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LeaderCheck INT;
    SELECT @LeaderCheck = LeaderUserId FROM dbo.Clans WHERE Id = @ClanId;

    IF @LeaderCheck IS NULL OR @LeaderCheck <> @LeaderUserId
    BEGIN
        SELECT 0 AS Success, 'Solo el LÃ­der Fundador puede disolver el clan.' AS Message;
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE u
        SET u.ClanCooldownUntil = DATEADD(HOUR, 24, GETDATE())
        FROM dbo.Usuarios u
        JOIN dbo.ClanMembers cm ON u.Id = cm.UserId
        WHERE cm.ClanId = @ClanId;

        DELETE FROM dbo.Clans WHERE Id = @ClanId;

        COMMIT TRANSACTION;
        SELECT 1 AS Success, 'El clan ha sido disuelto permanentemente.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EditarSubasta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EditarSubasta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EditarSubasta];
GO
CREATE   PROCEDURE dbo.sp_EditarSubasta
            @SubastaId INT,
            @CardCode INT,
            @CardName NVARCHAR(255),
            @CardRarity NVARCHAR(50),
            @CardType NVARCHAR(100),
            @ImageUrl NVARCHAR(500),
            @InitialPrice INT,
            @MinBidIncrement INT,
            @ExtendMinutes INT = 0
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @CurrentStatus NVARCHAR(20);
                DECLARE @HighestBidderId INT;
                DECLARE @CurrentPrice INT;
                DECLARE @EndsAt DATETIME;

                SELECT 
                    @CurrentStatus = Status,
                    @HighestBidderId = HighestBidderId,
                    @CurrentPrice = CurrentPrice,
                    @EndsAt = EndsAt
                FROM dbo.EventosSubasta
                WHERE Id = @SubastaId;

                IF @CurrentStatus IS NULL
                BEGIN
                    THROW 51001, 'La subasta no existe.', 1;
                END

                IF @CurrentStatus <> 'ACTIVE'
                BEGIN
                    THROW 51002, 'Solo se pueden editar subastas que estÃ©n activas.', 1;
                END

                IF @HighestBidderId IS NULL
                BEGIN
                    SET @CurrentPrice = @InitialPrice;
                END

                IF @ExtendMinutes > 0
                BEGIN
                    IF @EndsAt < GETDATE()
                        SET @EndsAt = DATEADD(MINUTE, @ExtendMinutes, GETDATE());
                    ELSE
                        SET @EndsAt = DATEADD(MINUTE, @ExtendMinutes, @EndsAt);
                END

                UPDATE dbo.EventosSubasta
                SET CardCode = @CardCode,
                    CardName = @CardName,
                    CardRarity = @CardRarity,
                    CardType = @CardType,
                    ImageUrl = @ImageUrl,
                    InitialPrice = @InitialPrice,
                    MinBidIncrement = @MinBidIncrement,
                    CurrentPrice = @CurrentPrice,
                    EndsAt = @EndsAt
                WHERE Id = @SubastaId;

                COMMIT TRANSACTION;

                SELECT 1 AS Success, 'Subasta actualizada exitosamente.' AS Message;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51000, @Err, 1;
            END CATCH
        END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EliminarMensajeChat]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EliminarMensajeChat]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EliminarMensajeChat];
GO
CREATE   PROCEDURE dbo.sp_EliminarMensajeChat
                @MessageId BIGINT,
                @UserId INT,
                @IsAdmin BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                
                DECLARE @MsgOwnerId INT;
                SELECT @MsgOwnerId = UserId FROM dbo.ChatMessages WHERE Id = @MessageId;

                IF @MsgOwnerId IS NULL
                BEGIN
                    SELECT 0 AS Success, 'Mensaje no encontrado.' AS Message;
                    RETURN;
                END

                IF @IsAdmin = 1 OR @MsgOwnerId = @UserId
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE Id = @MessageId;

                    SELECT 1 AS Success, 'Mensaje eliminado.' AS Message;
                END
                ELSE
                BEGIN
                    SELECT 0 AS Success, 'No tienes permisos para eliminar este mensaje.' AS Message;
                END
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EliminarTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EliminarTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EliminarTorneo];
GO
CREATE   PROCEDURE dbo.sp_EliminarTorneo
                @TorneoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                BEGIN TRY
                    DELETE FROM dbo.TorneoPartidas WHERE TorneoId = @TorneoId;
                    DELETE FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId;
                    DELETE FROM dbo.Torneos WHERE Id = @TorneoId;

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EntregarFichaPuzzle]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EntregarFichaPuzzle]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EntregarFichaPuzzle];
GO

CREATE   PROCEDURE dbo.sp_EntregarFichaPuzzle
    @EventId INT,
    @UserId INT,
    @PieceIndex INT
AS
BEGIN
    SET NOCOUNT ON;

    MERGE dbo.Events_Puzzle_Pieces AS target
    USING (SELECT @EventId AS event_id, @UserId AS user_id, @PieceIndex AS piece_index) AS source
    ON (target.event_id = source.event_id AND target.user_id = source.user_id AND target.piece_index = source.piece_index)
    WHEN MATCHED THEN
        UPDATE SET quantity = target.quantity + 1, updated_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (event_id, user_id, piece_index, quantity) VALUES (@EventId, @UserId, @PieceIndex, 1);

    SELECT 1 AS Success, 'Ficha registrada en base de datos.' AS Message;
END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EntregarPremiosTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EntregarPremiosTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EntregarPremiosTorneo];
GO
CREATE   PROCEDURE dbo.sp_EntregarPremiosTorneo
                @TorneoId INT,
                @NotasEntrega NVARCHAR(MAX) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE dbo.Torneos
                SET 
                    PremiosEntregados = 1,
                    NotasEntregaPremios = @NotasEntrega
                WHERE Id = @TorneoId;

                SELECT 1 AS Success;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EnviarRegalo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EnviarRegalo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EnviarRegalo];
GO

        CREATE   PROCEDURE dbo.sp_EnviarRegalo
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
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_EquiparCosmetico]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_EquiparCosmetico]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_EquiparCosmetico];
GO

        CREATE   PROCEDURE dbo.sp_EquiparCosmetico
            @UserId INT = NULL,
            @UsuarioId INT = NULL,
            @ItemType VARCHAR(20) = NULL,
            @ItemCode VARCHAR(50) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;

            DECLARE @TargetUserId INT = COALESCE(@UserId, @UsuarioId);
            IF @TargetUserId IS NULL
            BEGIN
                SELECT 0 AS Success, 'Usuario no especificado.' AS Message;
                RETURN;
            END

            DECLARE @Type VARCHAR(20) = UPPER(LTRIM(RTRIM(ISNULL(@ItemType, ''))));
            DECLARE @Code VARCHAR(50) = UPPER(LTRIM(RTRIM(ISNULL(@ItemCode, ''))));

            IF @Code IN ('NONE', 'DEFAULT', 'NULL', 'EMPTY', '')
            BEGIN
                SET @Code = NULL;
            END

            IF @Type = 'AVATAR'
            BEGIN
                IF @Code IS NULL
                BEGIN
                    SET @Code = 'AVA-002';
                END

                -- AVA-002 es el avatar oficial por defecto para todo duelista
                IF @Code = 'AVA-002'
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @TargetUserId AND AvatarCode = 'AVA-002')
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                        VALUES (@TargetUserId, 'AVA-002', 0.00, 0.00, 0.00, 1, GETDATE());
                    END
                END
                ELSE
                BEGIN
                    -- Si es Admin y es AVA-001, permitir siempre
                    IF @Code = 'AVA-001' AND EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Id = @TargetUserId AND IsAdmin = 1)
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @TargetUserId AND AvatarCode = 'AVA-001')
                        BEGIN
                            INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                            VALUES (@TargetUserId, 'AVA-001', 5.00, 5.00, 3.00, 1, GETDATE());
                        END
                    END
                    ELSE IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @TargetUserId AND AvatarCode = @Code)
                    BEGIN
                        SELECT 0 AS Success, 'No eres dueño de este avatar.' AS Message;
                        RETURN;
                    END
                END

                -- Actualizar AvatarActivoId en Usuarios
                UPDATE dbo.Usuarios 
                SET AvatarActivoId = @Code 
                WHERE Id = @TargetUserId;

                -- Actualizar IsActive en UserAvatars
                UPDATE dbo.UserAvatars 
                SET IsActive = CASE WHEN AvatarCode = @Code THEN 1 ELSE 0 END 
                WHERE UserId = @TargetUserId;

                SELECT 
                    1 AS Success, 
                    'Avatar activado exitosamente.' AS Message, 
                    @Code AS AvatarActivoId;
                RETURN;
            END
            ELSE IF @Type = 'PLAYMAT'
            BEGIN
                IF @Code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @TargetUserId AND PlaymatCode = @Code)
                BEGIN
                    SELECT 0 AS Success, 'No eres dueño de este tapete.' AS Message;
                    RETURN;
                END

                UPDATE dbo.Usuarios SET MatActivoId = @Code WHERE Id = @TargetUserId;
                SELECT 1 AS Success, 'Tapete configurado correctamente.' AS Message, @Code AS MatActivoId;
                RETURN;
            END
            ELSE IF @Type = 'SLEEVE'
            BEGIN
                IF @Code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @TargetUserId AND SleeveCode = @Code)
                BEGIN
                    SELECT 0 AS Success, 'No eres dueño de esta funda.' AS Message;
                    RETURN;
                END

                UPDATE dbo.Usuarios SET FundaActivaId = @Code WHERE Id = @TargetUserId;
                SELECT 1 AS Success, 'Funda configurada correctamente.' AS Message, @Code AS FundaActivaId;
                RETURN;
            END

            SELECT 0 AS Success, 'Tipo de cosmético desconocido.' AS Message;
        END
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ExpulsarMiembroClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ExpulsarMiembroClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ExpulsarMiembroClan];
GO
CREATE   PROCEDURE dbo.sp_ExpulsarMiembroClan
    @ClanId INT,
    @AdminUserId INT,
    @TargetUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AdminRole VARCHAR(20), @TargetRole VARCHAR(20);
    SELECT @AdminRole = Role FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @AdminUserId;
    SELECT @TargetRole = Role FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @TargetUserId;

    IF @AdminRole IS NULL OR (@AdminRole <> 'Lider' AND @AdminRole <> 'Colider')
    BEGIN
        SELECT 0 AS Success, 'No tienes rango suficiente para expulsar miembros.' AS Message;
        RETURN;
    END

    IF @TargetRole IS NULL
    BEGIN
        SELECT 0 AS Success, 'El usuario seleccionado no pertenece a este clan.' AS Message;
        RETURN;
    END

    IF @TargetRole = 'Lider'
    BEGIN
        SELECT 0 AS Success, 'No se puede expulsar al LÃ­der Fundador del clan.' AS Message;
        RETURN;
    END

    IF @AdminRole = 'Colider' AND @TargetRole = 'Colider'
    BEGIN
        SELECT 0 AS Success, 'Un ColÃ­der no puede expulsar a otro ColÃ­der.' AS Message;
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @TargetUserId;

        UPDATE dbo.Usuarios 
        SET ClanCooldownUntil = DATEADD(HOUR, 24, GETDATE())
        WHERE Id = @TargetUserId;

        COMMIT TRANSACTION;
        SELECT 1 AS Success, 'Miembro expulsado del clan exitosamente.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_FinalizarDueloRecompensas]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_FinalizarDueloRecompensas]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_FinalizarDueloRecompensas];
GO

            CREATE   PROCEDURE dbo.sp_FinalizarDueloRecompensas
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_FinalizarSubasta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_FinalizarSubasta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_FinalizarSubasta];
GO

            CREATE   PROCEDURE dbo.sp_FinalizarSubasta
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
                            DECLARE @CleanCardName NVARCHAR(255) = REPLACE(@CardName, '"', '"');
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GetBoosterPacks]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GetBoosterPacks]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GetBoosterPacks];
GO
CREATE   PROCEDURE dbo.sp_GetBoosterPacks
            AS
            BEGIN
                SET NOCOUNT ON;
                -- 1. Lista de sobres
                SELECT 
                    PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack,
                    IsActive, IsVisible, UpdatedAt
                FROM dbo.BoosterPacks
                ORDER BY 
                    CASE WHEN PackId = 'LOB' THEN 0 ELSE 1 END,
                    PackId ASC;

                -- 2. Lista de overrides de cartas
                SELECT 
                    PackId, CardId, IsActive, PackDrop, DeckUsable, NpcDrop, UpdatedAt
                FROM dbo.PackCardOverrides;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GetCardInfo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GetCardInfo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GetCardInfo];
GO

        CREATE PROCEDURE sp_GetCardInfo
            @CardId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT TOP 1
                CardId AS id,
                CardId AS card_id,
                1 AS ot,
                0 AS alias,
                '0' AS setcode,
                CardType AS type,
                CASE 
                    WHEN CardType LIKE '%Spell%' THEN 2
                    WHEN CardType LIKE '%Trap%' THEN 4
                    ELSE 1
                END AS typeCode,
                Atk AS atk,
                Def AS def,
                Level AS level,
                Race AS race,
                Attribute AS attribute,
                0 AS category,
                Name AS name,
                COALESCE(NULLIF(Name_ES, ''), Name) AS name_es,
                Description AS [desc],
                COALESCE(NULLIF(Description_ES, ''), Description) AS desc_es,
                Description AS description,
                COALESCE(NULLIF(Description_ES, ''), Description) AS description_es,
                Rarity AS rarity,
                TypeLine AS typeLine,
                TypeLine_ES AS typeLine_es,
                Race_ES AS race_es,
                Attribute_ES AS attribute_es,
                ImageUrl AS image_url,
                ImageLargeUrl AS image_large
            FROM dbo.Cards
            WHERE CardId = @CardId;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GetUserCards]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GetUserCards]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GetUserCards];
GO

            CREATE   PROCEDURE dbo.sp_GetUserCards
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GetUserCosmetics]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GetUserCosmetics]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GetUserCosmetics];
GO

            CREATE   PROCEDURE dbo.sp_GetUserCosmetics
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GetUserDecks]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GetUserDecks]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GetUserDecks];
GO

            CREATE   PROCEDURE dbo.sp_GetUserDecks
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GuardarConfiguracionJuego]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GuardarConfiguracionJuego]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GuardarConfiguracionJuego];
GO

        CREATE   PROCEDURE dbo.sp_GuardarConfiguracionJuego
            @ConfigKey VARCHAR(100),
            @ConfigValue NVARCHAR(MAX),
            @Category VARCHAR(50) = 'GENERAL',
            @DataType VARCHAR(20) = 'STRING',
            @Description NVARCHAR(255) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            MERGE dbo.GameConfigurations AS target
            USING (SELECT @ConfigKey AS ConfigKey) AS source
            ON target.ConfigKey = source.ConfigKey
            WHEN MATCHED THEN
                UPDATE SET
                    ConfigValue = @ConfigValue,
                    ConfigCategory = ISNULL(@Category, target.ConfigCategory),
                    DataType = ISNULL(@DataType, target.DataType),
                    Description = ISNULL(@Description, target.Description),
                    UpdatedAt = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (ConfigKey, ConfigCategory, ConfigValue, DataType, Description, UpdatedAt)
                VALUES (@ConfigKey, @Category, @ConfigValue, @DataType, @Description, GETDATE());

            SELECT 1 AS Success, 'Configuración actualizada con éxito.' AS Message;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GuardarDeckUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GuardarDeckUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GuardarDeckUsuario];
GO

            CREATE   PROCEDURE dbo.sp_GuardarDeckUsuario
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_GuardarMensajeChat]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_GuardarMensajeChat]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_GuardarMensajeChat];
GO
CREATE   PROCEDURE dbo.sp_GuardarMensajeChat
                @UserId INT,
                @Username NVARCHAR(50),
                @AvatarCode NVARCHAR(50) = NULL,
                @ClanTag NVARCHAR(20) = NULL,
                @Message NVARCHAR(MAX),
                @TextColor NVARCHAR(30) = NULL,
                @IsAdmin BIT = 0,
                @IsSystem BIT = 0,
                @IsPinned BIT = 0,
                @IsPrivate BIT = 0,
                @TargetUserId INT = NULL,
                @TargetUsername NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                INSERT INTO dbo.ChatMessages (
                    UserId, Username, AvatarCode, ClanTag, Message,
                    TextColor, IsAdmin, IsSystem, IsPinned, IsPrivate,
                    TargetUserId, TargetUsername, IsDeleted, CreatedAt
                )
                VALUES (
                    @UserId, @Username, @AvatarCode, @ClanTag, @Message,
                    @TextColor, @IsAdmin, @IsSystem, @IsPinned, @IsPrivate,
                    @TargetUserId, @TargetUsername, 0, GETDATE()
                );

                SELECT SCOPE_IDENTITY() AS MessageId, GETDATE() AS CreatedAt;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_InscribirJugadorTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_InscribirJugadorTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_InscribirJugadorTorneo];
GO
CREATE   PROCEDURE dbo.sp_InscribirJugadorTorneo
                @TorneoId INT,
                @UserId INT,
                @Username NVARCHAR(50)
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- 1. Validar Torneo
                    DECLARE @Estado NVARCHAR(30), @MaxPart INT, @NivelMin INT, @NivelMax INT, @Costo INT, @Titulo NVARCHAR(150);
                    SELECT 
                        @Estado = Estado,
                        @MaxPart = MaxParticipantes,
                        @NivelMin = NivelMinimo,
                        @NivelMax = NivelMaximo,
                        @Costo = ISNULL(CostoInscripcion, 0),
                        @Titulo = Titulo
                    FROM dbo.Torneos WHERE Id = @TorneoId;

                    IF @Estado IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('El torneo especificado no existe.', 16, 1);
                        RETURN;
                    END

                    IF @Estado <> 'REGISTRO'
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('Las inscripciones para este torneo no estÃ¡n abiertas.', 16, 1);
                        RETURN;
                    END

                    -- 2. Validar Cupos
                    DECLARE @TotalInscritos INT;
                    SELECT @TotalInscritos = COUNT(*) FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId;
                    IF @TotalInscritos >= @MaxPart
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('El cupo mÃ¡ximo de participantes ya ha sido alcanzado.', 16, 1);
                        RETURN;
                    END

                    -- 3. Validar si ya estÃ¡ inscrito
                    IF EXISTS (SELECT 1 FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId AND (UserId = @UserId OR Username = @Username))
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('Ya te encuentras inscrito en este torneo.', 16, 1);
                        RETURN;
                    END

                    -- 4. Validar Nivel y Starships del Usuario
                    DECLARE @UserLvl INT, @UserStars INT, @Ava NVARCHAR(50), @Sleeve NVARCHAR(50), @Mat NVARCHAR(50);
                    SELECT 
                        @UserLvl = ISNULL(Nivel, 1), 
                        @UserStars = ISNULL(Starships, 0),
                        @Ava = ISNULL(AvatarActivoId, 'AVA-001'),
                        @Sleeve = ISNULL(FundaActivaId, 'default_sleeve'),
                        @Mat = 'default_mat'
                    FROM dbo.Usuarios WHERE Id = @UserId;

                    IF @UserLvl IS NULL
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('Usuario no encontrado en la base de datos.', 16, 1);
                        RETURN;
                    END

                    IF @UserLvl < @NivelMin OR @UserLvl > @NivelMax
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('Tu nivel no cumple los requisitos del torneo.', 16, 1);
                        RETURN;
                    END

                    IF @Costo > 0 AND @UserStars < @Costo
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('No tienes suficientes Starships para pagar la inscripciÃ³n.', 16, 1);
                        RETURN;
                    END

                    -- 5. Descontar Starships si aplica
                    IF @Costo > 0
                    BEGIN
                        UPDATE dbo.Usuarios
                        SET Starships = Starships - @Costo
                        WHERE Id = @UserId;
                    END

                    -- 6. Insertar Participante con Seed
                    DECLARE @NextSeed INT = @TotalInscritos + 1;
                    INSERT INTO dbo.TorneoParticipantes (
                        TorneoId, UserId, Username, Nivel, Avatar, Sleeve, Mat, Seed, Estado, InscritoAt
                    )
                    VALUES (
                        @TorneoId, @UserId, @Username, @UserLvl, @Ava, @Sleeve, @Mat, @NextSeed, 'ACTIVO', GETDATE()
                    );

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success, @NextSeed AS Seed, @Titulo AS TorneoTitulo;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_LimpiarConversacionPrivada]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_LimpiarConversacionPrivada]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_LimpiarConversacionPrivada];
GO
CREATE   PROCEDURE dbo.sp_LimpiarConversacionPrivada
                @UserId INT,
                @TargetUsername NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                DECLARE @CurrentUsername NVARCHAR(50);
                SELECT @CurrentUsername = Username FROM dbo.Usuarios WHERE Id = @UserId;

                IF @TargetUsername IS NOT NULL AND @TargetUsername <> '' AND @TargetUsername <> 'GLOBAL'
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE IsPrivate = 1
                      AND (
                           (Username = @CurrentUsername AND TargetUsername = @TargetUsername)
                        OR (Username = @TargetUsername AND TargetUsername = @CurrentUsername)
                      );
                END
                ELSE
                BEGIN
                    UPDATE dbo.ChatMessages
                    SET IsDeleted = 1
                    WHERE ISNULL(IsPrivate, 0) = 0;
                END

                SELECT 1 AS Success, 'ConversaciÃ³n vaciada exitosamente.' AS Message;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_MejorarAvatar]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_MejorarAvatar]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_MejorarAvatar];
GO

            CREATE   PROCEDURE dbo.sp_MejorarAvatar
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ModificarTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ModificarTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ModificarTorneo];
GO
CREATE   PROCEDURE dbo.sp_ModificarTorneo
                @TorneoId INT,
                @Titulo NVARCHAR(150),
                @Descripcion NVARCHAR(MAX) = NULL,
                @BannerUrl NVARCHAR(500) = NULL,
                @Formato NVARCHAR(50) = 'BO1',
                @MaxParticipantes INT = 8,
                @NivelMinimo INT = 1,
                @NivelMaximo INT = 500,
                @CostoInscripcion INT = 0,
                @TextoPremios NVARCHAR(MAX) = NULL,
                @FechaInicioInscripcion DATETIME2 = NULL,
                @FechaCierreInscripcion DATETIME2 = NULL,
                @FechaInicioTorneo DATETIME2 = NULL,
                @HorariosRondasJson NVARCHAR(MAX) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE dbo.Torneos
                SET 
                    Titulo = @Titulo,
                    Descripcion = @Descripcion,
                    BannerUrl = @BannerUrl,
                    Formato = @Formato,
                    MaxParticipantes = @MaxParticipantes,
                    NivelMinimo = @NivelMinimo,
                    NivelMaximo = @NivelMaximo,
                    CostoInscripcion = @CostoInscripcion,
                    TextoPremios = @TextoPremios,
                    FechaInicioInscripcion = @FechaInicioInscripcion,
                    FechaCierreInscripcion = @FechaCierreInscripcion,
                    FechaInicioTorneo = @FechaInicioTorneo,
                    HorariosRondasJson = @HorariosRondasJson
                WHERE Id = @TorneoId;

                SELECT @@ROWCOUNT AS RowsAffected;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerAvataresUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerAvataresUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerAvataresUsuario];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerAvataresUsuario
            @UserId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- Resultset 1: Avatares adquiridos por el usuario con estadísticas totales
            SELECT 
                ua.Id,
                ua.UserId,
                ua.AvatarCode,
                c.Name,
                c.ImageUrl,
                ua.ExpBoost,
                ua.StarshipsBoost,
                ua.LuckBoost,
                ua.IsActive,
                ua.AcquiredAt
            FROM dbo.UserAvatars ua
            LEFT JOIN dbo.AvatarsCatalog c ON ua.AvatarCode = c.Code
            WHERE ua.UserId = @UserId
            ORDER BY ua.AcquiredAt DESC;

            -- Resultset 2: Potenciadores aplicados por avatar
            SELECT 
                p.Id,
                p.UserId,
                p.AvatarCode,
                p.PotenciadorCode,
                p.PotenciadorName,
                p.BoostType,
                p.BoostValue,
                p.AppliedAt
            FROM dbo.UserAvatarPotenciadores p
            WHERE p.UserId = @UserId
            ORDER BY p.AppliedAt DESC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerBuzonUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerBuzonUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerBuzonUsuario];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerBuzonUsuario
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
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerBuzonYStats]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerBuzonYStats]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerBuzonYStats];
GO

            CREATE   PROCEDURE dbo.sp_ObtenerBuzonYStats
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerCartasDeSobres]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerCartasDeSobres]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerCartasDeSobres];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerCartasDeSobres
            @PackId NVARCHAR(50)
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT 
                bpc.Id,
                bpc.PackId,
                bpc.CardId,
                bpc.CardNumber,
                c.Name AS CardName,
                COALESCE(NULLIF(c.Name_ES, ''), c.Name) AS CardNameEs,
                c.CardType,
                c.Atk,
                c.Def,
                c.Level,
                c.Attribute,
                c.Race,
                c.Description,
                COALESCE(NULLIF(c.Description_ES, ''), c.Description) AS DescriptionEs,
                COALESCE(bpc.Rarity, c.Rarity, 'COMMON') AS Rarity,
                bpc.IsActive,
                bpc.PackDrop,
                bpc.DeckUsable,
                bpc.NpcDrop,
                c.ImageUrl,
                c.ImageLargeUrl
            FROM dbo.BoosterPackCards bpc
            INNER JOIN dbo.Cards c ON bpc.CardId = c.CardId
            WHERE UPPER(bpc.PackId) = UPPER(@PackId)
            ORDER BY bpc.Id ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerCatalogoAvatares]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerCatalogoAvatares]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerCatalogoAvatares];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerCatalogoAvatares
            @UserId INT = NULL
        AS
        BEGIN
            SET NOCOUNT ON;

            SELECT 
                c.Id,
                c.Code,
                c.Name,
                c.ImageUrl,
                c.ExpBoost,
                c.StarshipsBoost,
                c.LuckBoost,
                c.Currency,
                c.PriceStarships,
                c.PriceUsd,
                c.OfferText,
                c.IsVipOnly,
                c.IsActive,
                CASE WHEN ua.Id IS NOT NULL THEN 1 ELSE 0 END AS IsOwned,
                CASE WHEN ua.IsActive = 1 THEN 1 ELSE 0 END AS IsCurrentActive
            FROM dbo.AvatarsCatalog c
            LEFT JOIN dbo.UserAvatars ua ON c.Code = ua.AvatarCode AND ua.UserId = @UserId
            WHERE c.IsActive = 1
            ORDER BY c.Id ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerCatalogoAventura]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerCatalogoAventura]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerCatalogoAventura];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerCatalogoAventura
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. Eras Oficiales
            SELECT Id, Code, Series, Title, Subtitle, DescText, Icon, BgTheme, LevelRange, AssignedPack
            FROM dbo.AdventureEras
            ORDER BY Id ASC;

            -- 2. NPCs Oficiales
            SELECT Id, EraId, Name, Level, AvatarCode, PortraitCode, LocationName, LocX, LocY,
                   IsBoss, DeckTheme, KeyCards, Quote, AssignedPack, Difficulty, AiLevel,
                   DeckJson, ExtraDeckJson
            FROM dbo.AdventureNpcs
            ORDER BY Id ASC;

            -- 3. Medallas Oficiales
            SELECT Id, MedalCode, NpcId, EraId, Name, Icon, DescText, BoosterType, BoosterValue, Requirement
            FROM dbo.AdventureMedals
            ORDER BY NpcId ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerCatalogoSobresYCartas]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerCatalogoSobresYCartas]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerCatalogoSobresYCartas];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerCatalogoSobresYCartas
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. Catálogo de Sobres
            SELECT 
                PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible
            FROM dbo.BoosterPacks
            ORDER BY Series ASC, Code ASC;

            -- 2. Cartas asociadas a sobres con nombres oficiales en español e inglés desde dbo.Cards
            SELECT 
                bpc.Id,
                bpc.PackId,
                bpc.CardId,
                bpc.CardNumber,
                c.Name AS CardName,
                COALESCE(NULLIF(c.Name_ES, ''), c.Name) AS CardNameEs,
                c.CardType,
                c.Atk,
                c.Def,
                c.Level,
                c.Attribute,
                c.Race,
                c.Description,
                COALESCE(NULLIF(c.Description_ES, ''), c.Description) AS DescriptionEs,
                COALESCE(bpc.Rarity, c.Rarity, 'COMMON') AS Rarity,
                bpc.IsActive,
                bpc.PackDrop,
                bpc.DeckUsable,
                bpc.NpcDrop,
                c.ImageUrl,
                c.ImageLargeUrl
            FROM dbo.BoosterPackCards bpc
            INNER JOIN dbo.Cards c ON bpc.CardId = c.CardId
            ORDER BY bpc.Id ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerConfiguracionesJuego]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerConfiguracionesJuego]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerConfiguracionesJuego];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerConfiguracionesJuego
            @Category VARCHAR(50) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            SELECT ConfigKey, ConfigCategory, ConfigValue, DataType, Description, UpdatedAt
            FROM dbo.GameConfigurations
            WHERE @Category IS NULL OR ConfigCategory = @Category
            ORDER BY ConfigCategory, ConfigKey;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerCosmeticosUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerCosmeticosUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerCosmeticosUsuario];
GO

            CREATE   PROCEDURE dbo.sp_ObtenerCosmeticosUsuario
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerDatosLandingPage]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerDatosLandingPage]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerDatosLandingPage];
GO

            CREATE   PROCEDURE dbo.sp_ObtenerDatosLandingPage
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Total cartas
                SELECT COUNT(*) AS TotalCartas FROM dbo.Cards;

                -- Total sobres
                SELECT COUNT(*) AS TotalSobres FROM dbo.BoosterPacks WHERE IsActive = 1;

                -- Total duelistas
                SELECT COUNT(*) AS TotalNpcs FROM dbo.NPCs;
            END;
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerDeckEInventario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerDeckEInventario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerDeckEInventario];
GO

            CREATE   PROCEDURE dbo.sp_ObtenerDeckEInventario
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerDeckNpc]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerDeckNpc]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerDeckNpc];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerDeckNpc
            @NpcId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- Resultset 1: NPC Header Info
            SELECT n.Id, n.EraId, n.Name, n.Level, n.AvatarCode, n.PortraitCode,
                   n.LocationName, n.LocX, n.LocY, n.IsBoss, n.DeckTheme, n.KeyCards, n.Quote,
                   n.AssignedPack, n.Difficulty, n.AiLevel, n.ExpReward, n.StarshipsReward
            FROM dbo.NPCs n
            WHERE n.Id = @NpcId;

            -- Resultset 2: Normalized Deck Cards
            SELECT c.Id, c.NpcId, c.CardCode, c.CardName, c.Section, c.Quantity, c.SlotOrder
            FROM dbo.NpcDeckCards c
            WHERE c.NpcId = @NpcId
            ORDER BY c.Section ASC, c.SlotOrder ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerDetallePerfilUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerDetallePerfilUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerDetallePerfilUsuario];
GO

CREATE   PROCEDURE dbo.sp_ObtenerDetallePerfilUsuario
    @UserId INT = NULL,
    @Username NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Resolver el usuario por Id o por Username
    DECLARE @TargetId INT;

    IF @UserId IS NOT NULL AND @UserId > 0
    BEGIN
        SELECT @TargetId = Id FROM dbo.Usuarios WHERE Id = @UserId;
    END
    ELSE IF @Username IS NOT NULL AND LEN(LTRIM(RTRIM(@Username))) > 0
    BEGIN
        SELECT @TargetId = Id FROM dbo.Usuarios WHERE LOWER(Username) = LOWER(LTRIM(RTRIM(@Username)));
    END

    IF @TargetId IS NULL
    BEGIN
        SELECT 0 AS Success, 'Usuario no encontrado' AS Message;
        RETURN;
    END

    -- 2. Variables de Cálculo de Duelos
    DECLARE 
        @NpcDuels INT = 0,
        @NpcWins INT = 0,
        @NpcLosses INT = 0,
        @NpcWinRate DECIMAL(5,1) = 0.0,
        @PvpDuels INT = 0,
        @PvpWins INT = 0,
        @PvpLosses INT = 0,
        @PvpWinRate DECIMAL(5,1) = 0.0;

    -- Conteo de duelos NPC
    SELECT 
        @NpcDuels = COUNT(*),
        @NpcWins = ISNULL(SUM(CASE WHEN EsVictoria = 1 THEN 1 ELSE 0 END), 0)
    FROM dbo.HistorialDuelos
    WHERE UsuarioId = @TargetId AND EsPvp = 0;

    SET @NpcLosses = CASE WHEN (@NpcDuels - @NpcWins) < 0 THEN 0 ELSE (@NpcDuels - @NpcWins) END;
    IF @NpcDuels > 0
        SET @NpcWinRate = CAST((CAST(@NpcWins AS DECIMAL(10,2)) / CAST(@NpcDuels AS DECIMAL(10,2))) * 100.0 AS DECIMAL(5,1));

    -- Conteo de duelos PVP
    SELECT 
        @PvpDuels = COUNT(*),
        @PvpWins = ISNULL(SUM(CASE WHEN EsVictoria = 1 THEN 1 ELSE 0 END), 0)
    FROM dbo.HistorialDuelos
    WHERE UsuarioId = @TargetId AND EsPvp = 1;

    SET @PvpLosses = CASE WHEN (@PvpDuels - @PvpWins) < 0 THEN 0 ELSE (@PvpDuels - @PvpWins) END;
    IF @PvpDuels > 0
        SET @PvpWinRate = CAST((CAST(@PvpWins AS DECIMAL(10,2)) / CAST(@PvpDuels AS DECIMAL(10,2))) * 100.0 AS DECIMAL(5,1));

    -- 3. Retornar Ficha Completa del Jugador
    SELECT 
        1 AS Success,
        u.Id,
        u.Username,
        ISNULL(u.Nivel, 1) AS Nivel,
        ISNULL(u.Experiencia, 0) AS Experiencia,
        ISNULL(u.Starships, 0) AS Starships,
        ISNULL(u.AvatarActivoId, 'AVA-002') AS AvatarActivoId,
        ISNULL(u.FundaActivaId, 'default_sleeve') AS FundaActivaId,
        ISNULL(u.MatActivoId, 'default_mat') AS MatActivoId,
        ISNULL(u.CountryIsoCode, 'CO') AS CountryIsoCode,
        ISNULL(c.Name, 'Internacional') AS CountryName,
        ISNULL(c.FlagEmoji, '🌐') AS FlagEmoji,
        ISNULL(c.FlagSvgUrl, '') AS FlagSvgUrl,
        CAST(ISNULL(u.IsAdmin, 0) AS BIT) AS IsAdmin,
        CAST(ISNULL(u.IsOnline, 0) AS BIT) AS IsOnline,
        u.VipUntil,
        CASE WHEN u.VipUntil IS NOT NULL AND u.VipUntil > GETDATE() THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS IsVip,
        (SELECT TOP 1 uv.VipCode FROM dbo.UserVipPasses uv WHERE uv.UsuarioId = u.Id AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE()) ORDER BY uv.ExpiresAt DESC) AS VipCode,
        u.LastLoginAt,
        u.FechaCreacion,
        
        -- Información del Clan Oficial (Nombre o 'Sin Clan')
        ISNULL(clanInfo.ClanNombre, 'Sin Clan') AS ClanNombre,
        ISNULL(clanInfo.ClanTag, '') AS ClanTag,
        ISNULL(clanInfo.ClanId, 0) AS ClanId,
        ISNULL(clanInfo.ClanRol, 'Sin Rol') AS ClanRol,
        ISNULL(clanInfo.ClanEmblemUrl, '') AS ClanEmblemUrl,

        -- Bonificaciones Avatar Activo
        ISNULL(ua.ExpBoost, 0.0) AS AvatarExp,
        ISNULL(ua.StarshipsBoost, 0.0) AS AvatarStar,
        ISNULL(ua.LuckBoost, 0.0) AS AvatarLuck,

        -- Bonificaciones Medallas / Misiones
        ISNULL(ast.BonusExp, 0.0) AS AstBonusExp,
        ISNULL(ast.BonusStarships, 0.0) AS AstBonusStar,
        ISNULL(ast.BonusSuerte, 0.0) AS AstBonusLuck,

        -- Estadísticas Duelos NPC
        @NpcDuels AS NpcDuels,
        @NpcWins AS NpcWins,
        @NpcLosses AS NpcLosses,
        @NpcWinRate AS NpcWinRate,

        -- Estadísticas Duelos PVP
        @PvpDuels AS PvpDuels,
        @PvpWins AS PvpWins,
        @PvpLosses AS PvpLosses,
        @PvpWinRate AS PvpWinRate
    FROM dbo.Usuarios u
    LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
    LEFT JOIN dbo.UserAvatars ua ON u.Id = ua.UserId AND u.AvatarActivoId = ua.AvatarCode
    LEFT JOIN dbo.AvatarStats ast ON u.Id = ast.UsuarioId
    OUTER APPLY (
        SELECT TOP 1 cl.Id AS ClanId, cl.Name AS ClanNombre, cl.Tag AS ClanTag, cm.Role AS ClanRol, cl.EmblemUrl AS ClanEmblemUrl
        FROM dbo.ClanMembers cm
        INNER JOIN dbo.Clans cl ON cm.ClanId = cl.Id
        WHERE cm.UserId = u.Id AND cl.IsActive = 1
        ORDER BY cm.JoinedAt DESC
    ) clanInfo
    WHERE u.Id = @TargetId;
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerDetalleTorneo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerDetalleTorneo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerDetalleTorneo];
GO
CREATE   PROCEDURE dbo.sp_ObtenerDetalleTorneo
                @TorneoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                
                -- 1. Info Torneo
                SELECT 
                    t.*,
                    (SELECT COUNT(*) FROM dbo.TorneoParticipantes WHERE TorneoId = t.Id) AS TotalInscritos
                FROM dbo.Torneos t
                WHERE t.Id = @TorneoId;

                -- 2. Participantes
                SELECT 
                    tp.Id,
                    tp.TorneoId,
                    tp.UserId,
                    tp.Username,
                    tp.Nivel,
                    tp.Avatar,
                    tp.Sleeve,
                    tp.Mat,
                    tp.Seed,
                    tp.Estado,
                    tp.EliminadoEnRonda,
                    tp.InscritoAt
                FROM dbo.TorneoParticipantes tp
                WHERE tp.TorneoId = @TorneoId
                ORDER BY tp.Seed ASC, tp.InscritoAt ASC;

                -- 3. Partidas / Brackets
                SELECT 
                    part.*
                FROM dbo.TorneoPartidas part
                WHERE part.TorneoId = @TorneoId
                ORDER BY part.Ronda ASC, part.NumeroMatch ASC;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerEstadisticasDuelosUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerEstadisticasDuelosUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerEstadisticasDuelosUsuario];
GO
CREATE   PROCEDURE dbo.sp_ObtenerEstadisticasDuelosUsuario
                @UserId INT = NULL,
                @Username NVARCHAR(50) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @TargetId INT, @TargetUser NVARCHAR(50);
                SELECT @TargetId = Id, @TargetUser = Username 
                FROM dbo.Usuarios 
                WHERE (@UserId IS NOT NULL AND Id = @UserId)
                   OR (@Username IS NOT NULL AND Username = @Username);

                IF @TargetId IS NULL
                BEGIN
                    SELECT 
                        0 AS NpcDuels, 0 AS NpcWins, 0 AS NpcLosses, 0 AS NpcWinrate,
                        0 AS PvpDuels, 0 AS PvpWins, 0 AS PvpLosses, 0 AS PvpWinrate,
                        0 AS TotalDuels, 0 AS TotalWins, 0 AS TotalLosses, 0 AS TotalWinrate,
                        0 AS TotalStarshipsGanadas, 0 AS TotalExpGanada;
                    RETURN;
                END

                -- EstadÃ­sticas Agregadas
                SELECT 
                    -- NPC
                    ISNULL(SUM(CASE WHEN EsPvp = 0 THEN 1 ELSE 0 END), 0) AS NpcDuels,
                    ISNULL(SUM(CASE WHEN EsPvp = 0 AND EsVictoria = 1 THEN 1 ELSE 0 END), 0) AS NpcWins,
                    ISNULL(SUM(CASE WHEN EsPvp = 0 AND EsVictoria = 0 THEN 1 ELSE 0 END), 0) AS NpcLosses,
                    CASE 
                        WHEN SUM(CASE WHEN EsPvp = 0 THEN 1 ELSE 0 END) > 0 
                        THEN ROUND((CAST(SUM(CASE WHEN EsPvp = 0 AND EsVictoria = 1 THEN 1 ELSE 0 END) AS FLOAT) / SUM(CASE WHEN EsPvp = 0 THEN 1 ELSE 0 END)) * 100, 1)
                        ELSE 0 
                    END AS NpcWinrate,

                    -- PVP
                    ISNULL(SUM(CASE WHEN EsPvp = 1 THEN 1 ELSE 0 END), 0) AS PvpDuels,
                    ISNULL(SUM(CASE WHEN EsPvp = 1 AND EsVictoria = 1 THEN 1 ELSE 0 END), 0) AS PvpWins,
                    ISNULL(SUM(CASE WHEN EsPvp = 1 AND EsVictoria = 0 THEN 1 ELSE 0 END), 0) AS PvpLosses,
                    CASE 
                        WHEN SUM(CASE WHEN EsPvp = 1 THEN 1 ELSE 0 END) > 0 
                        THEN ROUND((CAST(SUM(CASE WHEN EsPvp = 1 AND EsVictoria = 1 THEN 1 ELSE 0 END) AS FLOAT) / SUM(CASE WHEN EsPvp = 1 THEN 1 ELSE 0 END)) * 100, 1)
                        ELSE 0 
                    END AS PvpWinrate,

                    -- TOTALES
                    COUNT(*) AS TotalDuels,
                    ISNULL(SUM(CASE WHEN EsVictoria = 1 THEN 1 ELSE 0 END), 0) AS TotalWins,
                    ISNULL(SUM(CASE WHEN EsVictoria = 0 THEN 1 ELSE 0 END), 0) AS TotalLosses,
                    CASE 
                        WHEN COUNT(*) > 0 
                        THEN ROUND((CAST(SUM(CASE WHEN EsVictoria = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100, 1)
                        ELSE 0 
                    END AS TotalWinrate,

                    -- RECOMPENSAS
                    ISNULL(SUM(StarshipsGanadas), 0) AS TotalStarshipsGanadas,
                    ISNULL(SUM(ExpGanada), 0) AS TotalExpGanada
                FROM dbo.HistorialDuelos
                WHERE UsuarioId = @TargetId;

                -- Historial detallado de los Ãºltimos 30 duelos
                SELECT TOP 30
                    h.Id,
                    h.RivalNombre,
                    h.NpcId,
                    h.EsPvp,
                    h.EsVictoria,
                    h.ExpGanada,
                    h.ExpPerdida,
                    h.StarshipsGanadas,
                    h.StarshipsPerdidas,
                    h.CardDropCode,
                    h.CardDropNombre,
                    h.NivelJugador,
                    h.NivelRival,
                    h.Turnos,
                    h.MotivoFin,
                    h.Fecha
                FROM dbo.HistorialDuelos h
                WHERE h.UsuarioId = @TargetId
                ORDER BY h.Fecha DESC;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerEstadoRompecabezasUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerEstadoRompecabezasUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerEstadoRompecabezasUsuario];
GO

CREATE   PROCEDURE dbo.sp_ObtenerEstadoRompecabezasUsuario
    @UserId INT,
    @EventId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Fichas que posee el usuario
    SELECT piece_index, quantity 
    FROM dbo.Events_Puzzle_Pieces 
    WHERE event_id = @EventId AND user_id = @UserId;

    -- 2. Registro de ganador si completó
    SELECT position, completed_at, prize_data, delivered 
    FROM dbo.Events_Puzzle_Winners 
    WHERE event_id = @EventId AND user_id = @UserId;

    -- 3. Canje de fichas si realizó
    SELECT pieces_exchanged, starships_awarded, exchanged_at 
    FROM dbo.Events_Puzzle_Exchanges 
    WHERE event_id = @EventId AND user_id = @UserId;

    -- 4. Lista general de ganadores del evento
    SELECT user_id, username, position, completed_at, prize_data, delivered 
    FROM dbo.Events_Puzzle_Winners 
    WHERE event_id = @EventId
    ORDER BY position ASC;
END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerHistorialChat]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerHistorialChat]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerHistorialChat];
GO
CREATE   PROCEDURE dbo.sp_ObtenerHistorialChat
            @UserId INT = NULL,
            @TargetUsername NVARCHAR(50) = NULL,
            @Limit INT = 100
        AS
        BEGIN
            SET NOCOUNT ON;
            
            IF @TargetUsername IS NOT NULL AND @TargetUsername <> ''
            BEGIN
                -- Mensajes privados entre el usuario actual y @TargetUsername (solo no eliminados)
                DECLARE @CurrentUsername NVARCHAR(50);
                SELECT @CurrentUsername = Username FROM dbo.Usuarios WHERE Id = @UserId;

                SELECT TOP (@Limit)
                    m.Id,
                    m.UserId,
                    m.Username,
                    m.AvatarCode,
                    m.ClanTag,
                    m.Message,
                    m.TextColor,
                    m.IsAdmin,
                    m.IsSystem,
                    m.IsPinned,
                    m.IsPrivate,
                    m.TargetUserId,
                    m.TargetUsername,
                    m.IsDeleted,
                    m.CreatedAt,
                    (SELECT TOP 1 uv.VipCode FROM dbo.UserVipPasses uv WHERE uv.UsuarioId = m.UserId AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE()) ORDER BY uv.ExpiresAt DESC) AS VipCode,
                    (SELECT TOP 1 u.VipUntil FROM dbo.Usuarios u WHERE u.Id = m.UserId) AS VipUntil
                FROM dbo.ChatMessages m
                WHERE m.IsPrivate = 1
                  AND ISNULL(m.IsDeleted, 0) = 0
                  AND (
                       (m.Username = @CurrentUsername AND m.TargetUsername = @TargetUsername)
                    OR (m.Username = @TargetUsername AND m.TargetUsername = @CurrentUsername)
                  )
                ORDER BY m.CreatedAt DESC;
            END
            ELSE
            BEGIN
                -- Mensajes del canal global (solo no eliminados)
                SELECT TOP (@Limit)
                    m.Id,
                    m.UserId,
                    m.Username,
                    m.AvatarCode,
                    m.ClanTag,
                    m.Message,
                    m.TextColor,
                    m.IsAdmin,
                    m.IsSystem,
                    m.IsPinned,
                    m.IsPrivate,
                    m.TargetUserId,
                    m.TargetUsername,
                    m.IsDeleted,
                    m.CreatedAt,
                    (SELECT TOP 1 uv.VipCode FROM dbo.UserVipPasses uv WHERE uv.UsuarioId = m.UserId AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE()) ORDER BY uv.ExpiresAt DESC) AS VipCode,
                    (SELECT TOP 1 u.VipUntil FROM dbo.Usuarios u WHERE u.Id = m.UserId) AS VipUntil
                FROM dbo.ChatMessages m
                WHERE ISNULL(m.IsPrivate, 0) = 0
                  AND ISNULL(m.IsDeleted, 0) = 0
                ORDER BY m.CreatedAt DESC;
            END
        END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerHistorialComprasSingles]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerHistorialComprasSingles]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerHistorialComprasSingles];
GO
CREATE   PROCEDURE dbo.sp_ObtenerHistorialComprasSingles
                @UsuarioId INT = NULL,
                @Limit INT = 50
            AS
            BEGIN
                SET NOCOUNT ON;
                IF @UsuarioId IS NOT NULL AND @UsuarioId > 0
                BEGIN
                    SELECT TOP (@Limit)
                        p.Id,
                        p.UsuarioId,
                        u.Username,
                        p.CardCode,
                        p.CardName,
                        p.PriceUsd,
                        p.PriceStarships,
                        p.PaymentMethod,
                        p.FoilType,
                        p.Quantity,
                        p.StarshipsBalanceBefore,
                        p.StarshipsBalanceAfter,
                        p.PurchasedAt
                    FROM dbo.UserSinglePurchases p
                    INNER JOIN dbo.Usuarios u ON p.UsuarioId = u.Id
                    WHERE p.UsuarioId = @UsuarioId
                    ORDER BY p.PurchasedAt DESC;
                END
                ELSE
                BEGIN
                    SELECT TOP (@Limit)
                        p.Id,
                        p.UsuarioId,
                        u.Username,
                        p.CardCode,
                        p.CardName,
                        p.PriceUsd,
                        p.PriceStarships,
                        p.PaymentMethod,
                        p.FoilType,
                        p.Quantity,
                        p.StarshipsBalanceBefore,
                        p.StarshipsBalanceAfter,
                        p.PurchasedAt
                    FROM dbo.UserSinglePurchases p
                    INNER JOIN dbo.Usuarios u ON p.UsuarioId = u.Id
                    ORDER BY p.PurchasedAt DESC;
                END
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerInfoCarta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerInfoCarta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerInfoCarta];
GO
CREATE   PROCEDURE sp_ObtenerInfoCarta
                @CardId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                EXEC sp_GetCardInfo @CardId = @CardId;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerListaClanes]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerListaClanes]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerListaClanes];
GO
CREATE   PROCEDURE dbo.sp_ObtenerListaClanes
    @UserId INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Clanes Activos
    SELECT 
        c.Id, c.Name, c.Tag, c.EmblemUrl, c.Level, c.Exp, c.NextLevelExp,
        c.MinLevelReq, c.NoticeMessage, c.MaxMembers, c.Trophies, c.CreatedAt,
        c.LeaderUserId,
        u.Username as LeaderUsername,
        ISNULL(u.CountryIsoCode, 'UN') as LeaderCountryIso,
        ISNULL(u.AvatarActivoId, 'AVA-001') as LeaderAvatar,
        (SELECT COUNT(1) FROM dbo.ClanMembers cm WHERE cm.ClanId = c.Id) as CurrentMembers,
        (SELECT COUNT(1) FROM dbo.ClanMembers cm2 JOIN dbo.Usuarios u2 ON cm2.UserId = u2.Id WHERE cm2.ClanId = c.Id AND u2.IsOnline = 1) as OnlineMembers
    FROM dbo.Clans c
    LEFT JOIN dbo.Usuarios u ON c.LeaderUserId = u.Id
    WHERE c.IsActive = 1
    ORDER BY c.Trophies DESC, c.Level DESC, c.Exp DESC, c.Id ASC;

    -- 2. MembresÃ­a y Solicitudes del Usuario si @UserId > 0
    IF @UserId > 0
    BEGIN
        SELECT ClanId FROM dbo.ClanMembers WHERE UserId = @UserId;
        SELECT ClanId, Status FROM dbo.ClanJoinRequests WHERE UserId = @UserId AND Status = 'PENDING';
        SELECT ClanCooldownUntil FROM dbo.Usuarios WHERE Id = @UserId;
    END
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerMedallasUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerMedallasUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerMedallasUsuario];
GO

        CREATE   PROCEDURE dbo.sp_ObtenerMedallasUsuario
            @UserId INT
        AS
        BEGIN
            SET NOCOUNT ON;

            -- 1. Resumen de Multiplicadores Acumulados
            SELECT 
                ISNULL(SUM(CASE WHEN m.BoosterType = 'exp' THEN m.BoosterValue ELSE 0 END), 0) AS TotalExpBonus,
                ISNULL(SUM(CASE WHEN m.BoosterType = 'starships' THEN m.BoosterValue ELSE 0 END), 0) AS TotalStarshipsBonus,
                ISNULL(SUM(CASE WHEN m.BoosterType = 'luck' THEN m.BoosterValue ELSE 0 END), 0) AS TotalLuckBonus,
                COUNT(um.MedalId) AS TotalUnlockedMedals
            FROM dbo.UserMedals um
            INNER JOIN dbo.AdventureMedals m ON um.MedalId = m.MedalCode
            WHERE um.UserId = @UserId;

            -- 2. Lista de Medallas Desbloqueadas
            SELECT m.MedalCode AS id, m.NpcId, m.EraId, m.Name, m.Icon, m.DescText AS [desc],
                   m.BoosterType, m.BoosterValue, um.UnlockedAt
            FROM dbo.UserMedals um
            INNER JOIN dbo.AdventureMedals m ON um.MedalId = m.MedalCode
            WHERE um.UserId = @UserId
            ORDER BY m.NpcId ASC;
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerMiClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerMiClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerMiClan];
GO
CREATE   PROCEDURE dbo.sp_ObtenerMiClan
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ClanId INT, @MyRole VARCHAR(20);

    SELECT @ClanId = ClanId, @MyRole = Role
    FROM dbo.ClanMembers
    WHERE UserId = @UserId;

    IF @ClanId IS NULL
    BEGIN
        -- Retornar informaciÃ³n si tiene penalizaciÃ³n activa
        SELECT 
            0 AS HasClan,
            ClanCooldownUntil,
            CASE WHEN ClanCooldownUntil > GETDATE() THEN 1 ELSE 0 END AS HasPenalty,
            CASE WHEN ClanCooldownUntil > GETDATE() THEN DATEDIFF(MINUTE, GETDATE(), ClanCooldownUntil) ELSE 0 END AS PenaltyMinutesRemaining
        FROM dbo.Usuarios 
        WHERE Id = @UserId;
        RETURN;
    END

    -- 1. Resumen de Mi Clan
    SELECT 
        1 AS HasClan,
        c.Id, c.Name, c.Tag, c.EmblemUrl, c.Level, c.Exp, c.NextLevelExp,
        c.MinLevelReq, c.NoticeMessage, c.MaxMembers, c.Trophies, c.CreatedAt,
        c.LeaderUserId,
        cm.Role AS MyRole,
        cm.ContributedExp AS MyContributedExp,
        cm.JoinedAt AS MyJoinedAt,
        (SELECT COUNT(1) FROM dbo.ClanMembers cm_all WHERE cm_all.ClanId = c.Id) AS TotalMembers,
        (SELECT COUNT(1) FROM dbo.ClanMembers cm_on JOIN dbo.Usuarios u_on ON cm_on.UserId = u_on.Id WHERE cm_on.ClanId = c.Id AND u_on.IsOnline = 1) AS OnlineMembers
    FROM dbo.Clans c
    JOIN dbo.ClanMembers cm ON cm.ClanId = c.Id AND cm.UserId = @UserId
    WHERE c.Id = @ClanId AND c.IsActive = 1;

    -- 2. Lista de Miembros con estado Online en tiempo real
    SELECT 
        cm.UserId, cm.Role, cm.ContributedExp, cm.JoinedAt,
        u.Username, 
        ISNULL(u.Nivel, 1) as Nivel, 
        ISNULL(u.AvatarActivoId, 'AVA-002') as AvatarActivoId,
        ISNULL(u.CountryIsoCode, 'UN') as CountryIsoCode,
        ISNULL(co.Name, 'Mundial') as CountryName,
        ISNULL(co.FlagEmoji, 'ðŸŒ') as FlagEmoji,
        ISNULL(u.IsOnline, 0) as IsOnline,
        u.LastLoginAt
    FROM dbo.ClanMembers cm
    JOIN dbo.Usuarios u ON cm.UserId = u.Id
    LEFT JOIN dbo.Countries co ON u.CountryIsoCode = co.IsoCode
    WHERE cm.ClanId = @ClanId
    ORDER BY 
        CASE cm.Role 
            WHEN 'Lider' THEN 1 
            WHEN 'Colider' THEN 2 
            ELSE 3 
        END,
        u.IsOnline DESC,
        cm.ContributedExp DESC,
        u.Nivel DESC;

    -- 3. Solicitudes Pendientes (solo si es LÃ­der o ColÃ­der)
    IF @MyRole = 'Lider' OR @MyRole = 'Colider'
    BEGIN
        SELECT 
            cjr.Id as RequestId, cjr.UserId, cjr.CreatedAt as RequestedAt,
            u.Username, 
            ISNULL(u.Nivel, 1) as Nivel, 
            ISNULL(u.AvatarActivoId, 'AVA-002') as AvatarActivoId,
            ISNULL(u.CountryIsoCode, 'UN') as CountryIsoCode,
            ISNULL(co.FlagEmoji, 'ðŸŒ') as FlagEmoji,
            ISNULL(u.IsOnline, 0) as IsOnline
        FROM dbo.ClanJoinRequests cjr
        JOIN dbo.Usuarios u ON cjr.UserId = u.Id
        LEFT JOIN dbo.Countries co ON u.CountryIsoCode = co.IsoCode
        WHERE cjr.ClanId = @ClanId AND cjr.Status = 'PENDING'
        ORDER BY cjr.CreatedAt ASC;
    END
    ELSE
    BEGIN
        SELECT TOP 0 1 AS RequestId;
    END
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerPerfilUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerPerfilUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerPerfilUsuario];
GO

CREATE   PROCEDURE dbo.sp_ObtenerPerfilUsuario
    @UserId INT = NULL,
    @Username NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ObtenerDetallePerfilUsuario @UserId = @UserId, @Username = @Username;
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ObtenerTorneos]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ObtenerTorneos]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ObtenerTorneos];
GO
CREATE   PROCEDURE dbo.sp_ObtenerTorneos
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    t.Id,
                    t.Titulo,
                    t.Descripcion,
                    t.BannerUrl,
                    t.Formato,
                    t.MaxParticipantes,
                    t.NivelMinimo,
                    t.NivelMaximo,
                    t.CostoInscripcion,
                    t.TextoPremios,
                    t.FechaInicioInscripcion,
                    t.FechaCierreInscripcion,
                    t.FechaInicioTorneo,
                    t.HorariosRondasJson,
                    t.Estado,
                    t.RondaActual,
                    t.CampeonUserId,
                    t.CampeonUsername,
                    t.SubcampeonUsername,
                    t.TercerLugarUsername,
                    t.PremiosEntregados,
                    t.NotasEntregaPremios,
                    t.CreadoPor,
                    t.CreatedAt,
                    (SELECT COUNT(*) FROM dbo.TorneoParticipantes WHERE TorneoId = t.Id) AS TotalInscritos
                FROM dbo.Torneos t
                ORDER BY 
                    CASE 
                        WHEN t.Estado = 'EN_CURSO' THEN 1
                        WHEN t.Estado = 'REGISTRO' THEN 2
                        WHEN t.Estado = 'FINALIZADO' THEN 3
                        ELSE 4
                    END,
                    t.CreatedAt DESC;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_RealizarPujaSubasta]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_RealizarPujaSubasta]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_RealizarPujaSubasta];
GO
CREATE   PROCEDURE dbo.sp_RealizarPujaSubasta
                @SubastaId INT,
                @UsuarioId INT,
                @Username NVARCHAR(100),
                @BidAmount INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @Status VARCHAR(20), @EndsAt DATETIME, @CurrentPrice INT, @MinIncrement INT;
                    DECLARE @PrevBidderId INT, @PrevBidAmount INT, @HighestBidderUsername NVARCHAR(100);

                    SELECT 
                        @Status = Status,
                        @EndsAt = EndsAt,
                        @CurrentPrice = CurrentPrice,
                        @MinIncrement = MinBidIncrement,
                        @PrevBidderId = HighestBidderId,
                        @HighestBidderUsername = HighestBidderUsername
                    FROM dbo.EventosSubasta WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = @SubastaId;

                    IF @Status IS NULL
                    BEGIN
                        THROW 51001, 'La subasta no existe.', 1;
                    END

                    IF @Status <> 'ACTIVE' OR GETDATE() >= @EndsAt
                    BEGIN
                        THROW 51002, 'La subasta ya ha finalizado.', 1;
                    END

                    -- Validar que la puja sea mayor o igual al precio actual + incremento mÃ­nimo (o precio inicial si es primera puja)
                    DECLARE @RequiredMin INT;
                    IF @PrevBidderId IS NULL
                    BEGIN
                        SET @RequiredMin = @CurrentPrice;
                    END
                    ELSE
                    BEGIN
                        SET @RequiredMin = @CurrentPrice + @MinIncrement;
                    END

                    IF @BidAmount < @RequiredMin
                    BEGIN
                        DECLARE @MsgMin NVARCHAR(200) = 'La puja mÃ­nima debe ser de al menos ' + CAST(@RequiredMin AS NVARCHAR(20)) + ' estrellas.';
                        THROW 51003, @MsgMin, 1;
                    END

                    -- Validar que el usuario tenga suficientes estrellas
                    DECLARE @UserStars BIGINT;
                    SELECT @UserStars = Starships FROM dbo.Usuarios WITH (UPDLOCK, ROWLOCK) WHERE Id = @UsuarioId;

                    IF @UserStars IS NULL OR @UserStars < @BidAmount
                    BEGIN
                        THROW 51004, 'No cuentas con las estrellas suficientes para realizar esta puja.', 1;
                    END

                    -- Si el usuario ya era el mÃ¡ximo postor, primero se le reintegra la puja anterior para luego retener la nueva
                    IF @PrevBidderId IS NOT NULL
                    BEGIN
                        SELECT TOP 1 @PrevBidAmount = BidAmount 
                        FROM dbo.SubastaPujas 
                        WHERE SubastaId = @SubastaId AND Status = 'HELD'
                        ORDER BY Id DESC;

                        IF @PrevBidAmount IS NOT NULL AND @PrevBidAmount > 0
                        BEGIN
                            -- Reintegrar estrellas al postor anterior
                            UPDATE dbo.Usuarios 
                            SET Starships = Starships + @PrevBidAmount 
                            WHERE Id = @PrevBidderId;

                            -- Marcar la puja anterior como REFUNDED
                            UPDATE dbo.SubastaPujas 
                            SET Status = 'REFUNDED' 
                            WHERE SubastaId = @SubastaId AND Status = 'HELD';
                        END
                    END

                    -- Retener (escrow) las estrellas del nuevo postor
                    UPDATE dbo.Usuarios 
                    SET Starships = Starships - @BidAmount 
                    WHERE Id = @UsuarioId;

                    -- Registrar la nueva puja como HELD
                    INSERT INTO dbo.SubastaPujas (SubastaId, UsuarioId, Username, BidAmount, Status, PlacedAt)
                    VALUES (@SubastaId, @UsuarioId, @Username, @BidAmount, 'HELD', GETDATE());

                    -- Actualizar el estado de la subasta
                    UPDATE dbo.EventosSubasta
                    SET 
                        CurrentPrice = @BidAmount,
                        HighestBidderId = @UsuarioId,
                        HighestBidderUsername = @Username
                    WHERE Id = @SubastaId;

                    -- Obtener nuevo saldo del usuario
                    DECLARE @NewBalance BIGINT;
                    SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                    COMMIT TRANSACTION;

                    SELECT 
                        1 AS Success,
                        @BidAmount AS CurrentPrice,
                        @NewBalance AS NewBalance,
                        @Username AS HighestBidderUsername,
                        'Â¡Puja registrada exitosamente! Estrellas retenidas.' AS Message;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    DECLARE @ErrPuja NVARCHAR(4000) = ERROR_MESSAGE();
                    THROW 51005, @ErrPuja, 1;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ReclamarRegaloBuzon]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ReclamarRegaloBuzon]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ReclamarRegaloBuzon];
GO

CREATE   PROCEDURE dbo.sp_ReclamarRegaloBuzon
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
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_RegistrarFinDueloPvP]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_RegistrarFinDueloPvP]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_RegistrarFinDueloPvP];
GO
CREATE   PROCEDURE dbo.sp_RegistrarFinDueloPvP
                @WinnerUserId INT,
                @WinnerNewLevel INT,
                @WinnerNewExp INT,
                @WinnerStarshipsWon BIGINT,
                @WinnerExpWon INT,
                @CardDropCode INT = NULL,
                @LoserUsername NVARCHAR(50) = NULL,
                @LoserStarshipsDeducted BIGINT = 0,
                @LoserExpDeducted INT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- 1. Actualizar Ganador
                    UPDATE dbo.Usuarios 
                    SET Nivel = @WinnerNewLevel, 
                        Experiencia = @WinnerNewExp, 
                        Starships = ISNULL(Starships, 0) + @WinnerStarshipsWon 
                    WHERE Id = @WinnerUserId;

                    -- Historial Ganador
                    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'HistorialDuelos')
                    BEGIN
                        INSERT INTO dbo.HistorialDuelos (UsuarioId, RivalNombre, EsPvp, EsVictoria, ExpGanada, StarshipsGanadas, CardDropCode, Fecha)
                        VALUES (@WinnerUserId, ISNULL(@LoserUsername, 'Rival'), 1, 1, @WinnerExpWon, @WinnerStarshipsWon, @CardDropCode, GETDATE());
                    END

                    -- 2. Actualizar Perdedor (si aplica)
                    IF @LoserUsername IS NOT NULL AND @LoserUsername <> '' AND @LoserUsername NOT LIKE '%NPC%'
                    BEGIN
                        DECLARE @LoserId INT;
                        SELECT @LoserId = Id FROM dbo.Usuarios WHERE Username = @LoserUsername;

                        IF @LoserId IS NOT NULL
                        BEGIN
                            UPDATE dbo.Usuarios 
                            SET Starships = CASE WHEN Starships >= @LoserStarshipsDeducted THEN Starships - @LoserStarshipsDeducted ELSE 0 END,
                                Experiencia = CASE WHEN Experiencia >= @LoserExpDeducted THEN Experiencia - @LoserExpDeducted ELSE 0 END
                            WHERE Id = @LoserId;

                            -- Historial Perdedor
                            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'HistorialDuelos')
                            BEGIN
                                INSERT INTO dbo.HistorialDuelos (UsuarioId, RivalNombre, EsPvp, EsVictoria, ExpGanada, StarshipsGanadas, CardDropCode, Fecha)
                                VALUES (@LoserId, (SELECT Username FROM dbo.Usuarios WHERE Id = @WinnerUserId), 1, 0, -@LoserExpDeducted, -@LoserStarshipsDeducted, NULL, GETDATE());
                            END
                        END
                    END

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_RegistrarNuevoUsuario]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_RegistrarNuevoUsuario]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_RegistrarNuevoUsuario];
GO

            CREATE   PROCEDURE dbo.sp_RegistrarNuevoUsuario
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_RegistrarResultadoDuelo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_RegistrarResultadoDuelo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_RegistrarResultadoDuelo];
GO
CREATE   PROCEDURE dbo.sp_RegistrarResultadoDuelo
                @UsuarioId INT,
                @Username NVARCHAR(50),
                @RivalId INT = NULL,
                @RivalNombre NVARCHAR(100),
                @NpcId INT = NULL,
                @EsPvp BIT,
                @EsVictoria BIT,
                @ExpGanada INT = 0,
                @ExpPerdida INT = 0,
                @StarshipsGanadas BIGINT = 0,
                @StarshipsPerdidas BIGINT = 0,
                @CardDropCode INT = NULL,
                @CardDropNombre NVARCHAR(150) = NULL,
                @NivelJugador INT = 1,
                @NivelRival INT = 1,
                @Turnos INT = 1,
                @MotivoFin NVARCHAR(50) = 'LP_ZERO',
                @LogFilePath NVARCHAR(255) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRY
                    BEGIN TRANSACTION;

                    -- 1. Insertar en dbo.HistorialDuelos
                    INSERT INTO dbo.HistorialDuelos (
                        UsuarioId, Username, RivalId, RivalNombre, NpcId, EsPvp, EsVictoria,
                        ExpGanada, ExpPerdida, StarshipsGanadas, StarshipsPerdidas,
                        CardDropCode, CardDropNombre, NivelJugador, NivelRival, Turnos, MotivoFin, LogFilePath, Fecha
                    )
                    VALUES (
                        @UsuarioId, @Username, @RivalId, @RivalNombre, @NpcId, @EsPvp, @EsVictoria,
                        @ExpGanada, @ExpPerdida, @StarshipsGanadas, @StarshipsPerdidas,
                        @CardDropCode, @CardDropNombre, @NivelJugador, @NivelRival, @Turnos, @MotivoFin, @LogFilePath, GETDATE()
                    );

                    -- 2. Si es contra NPC en modo Aventura, actualizar tabla UserNpcRecords
                    IF @EsPvp = 0 AND @NpcId IS NOT NULL
                    BEGIN
                        IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UsuarioId AND NpcId = @NpcId)
                        BEGIN
                            UPDATE dbo.UserNpcRecords
                            SET 
                                Wins = Wins + CASE WHEN @EsVictoria = 1 THEN 1 ELSE 0 END,
                                Losses = Losses + CASE WHEN @EsVictoria = 0 THEN 1 ELSE 0 END,
                                BestTurns = CASE 
                                    WHEN @EsVictoria = 1 AND (BestTurns IS NULL OR @Turnos < BestTurns) THEN @Turnos 
                                    ELSE BestTurns 
                                END,
                                LastDefeatedAt = CASE WHEN @EsVictoria = 1 THEN GETDATE() ELSE LastDefeatedAt END
                            WHERE UserId = @UsuarioId AND NpcId = @NpcId;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                            VALUES (
                                @UsuarioId, 
                                @NpcId, 
                                CASE WHEN @EsVictoria = 1 THEN 1 ELSE 0 END, 
                                CASE WHEN @EsVictoria = 0 THEN 1 ELSE 0 END, 
                                @Turnos, 
                                CASE WHEN @EsVictoria = 1 THEN GETDATE() ELSE NULL END
                            );
                        END
                    END

                    COMMIT TRANSACTION;
                    SELECT 1 AS Success, SCOPE_IDENTITY() AS HistorialId;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_RegistrarVictoriaNpc]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_RegistrarVictoriaNpc]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_RegistrarVictoriaNpc];
GO

        CREATE   PROCEDURE dbo.sp_RegistrarVictoriaNpc
            @UserId INT,
            @NpcId INT,
            @Turns INT = 10,
            @IsWinner BIT = 1
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                -- Normalizar alias de sesión Admin si viniera como 999
                IF @UserId = 999
                BEGIN
                    SELECT TOP 1 @UserId = Id FROM dbo.Usuarios WHERE IsAdmin = 1 OR Id = 1;
                    IF @UserId IS NULL SET @UserId = 1;
                END

                DECLARE @IsFirstTimeWin BIT = 0;
                DECLARE @MedalUnlocked BIT = 0;
                DECLARE @UnlockedMedalCode VARCHAR(50) = NULL;
                DECLARE @UnlockedMedalName NVARCHAR(100) = NULL;
                DECLARE @IsNewNpcUnlocked BIT = 0;
                DECLARE @CurrentMax INT = 1;

                SELECT @CurrentMax = ISNULL(MaxNpcUnlocked, 1) 
                FROM dbo.UserAdventureProgress WITH (UPDLOCK, ROWLOCK)
                WHERE UserId = @UserId;

                IF @CurrentMax IS NULL SET @CurrentMax = 1;

                -- Si fue victoria
                IF @IsWinner = 1
                BEGIN
                    -- Verificar si es la primera victoria contra este NPC
                    DECLARE @ExistingWins INT = 0;
                    SELECT @ExistingWins = ISNULL(Wins, 0)
                    FROM dbo.UserNpcRecords WITH (UPDLOCK, ROWLOCK)
                    WHERE UserId = @UserId AND NpcId = @NpcId;

                    IF @ExistingWins = 0
                    BEGIN
                        SET @IsFirstTimeWin = 1;

                        -- Desbloquear Medalla oficial de este NPC si no la tiene
                        SELECT @UnlockedMedalCode = MedalCode, @UnlockedMedalName = Name
                        FROM dbo.AdventureMedals
                        WHERE NpcId = @NpcId;

                        IF @UnlockedMedalCode IS NOT NULL
                        BEGIN
                            IF NOT EXISTS (SELECT 1 FROM dbo.UserMedals WHERE UserId = @UserId AND MedalId = @UnlockedMedalCode)
                            BEGIN
                                INSERT INTO dbo.UserMedals (UserId, MedalId, UnlockedAt)
                                VALUES (@UserId, @UnlockedMedalCode, GETDATE());
                                SET @MedalUnlocked = 1;
                            END
                        END

                        -- Desbloquear el siguiente NPC en la campaña de aventura (hasta 223)
                        IF @NpcId >= @CurrentMax AND @CurrentMax < 223
                        BEGIN
                            SET @CurrentMax = @NpcId + 1;
                            SET @IsNewNpcUnlocked = 1;

                            IF EXISTS (SELECT 1 FROM dbo.UserAdventureProgress WHERE UserId = @UserId)
                            BEGIN
                                UPDATE dbo.UserAdventureProgress 
                                SET MaxNpcUnlocked = @CurrentMax, UpdatedAt = GETDATE()
                                WHERE UserId = @UserId;
                            END
                            ELSE
                            BEGIN
                                INSERT INTO dbo.UserAdventureProgress (UserId, MaxNpcUnlocked, UpdatedAt)
                                VALUES (@UserId, @CurrentMax, GETDATE());
                            END
                        END
                    END

                    -- Registrar récord de victoria
                    IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UserId AND NpcId = @NpcId)
                    BEGIN
                        UPDATE dbo.UserNpcRecords SET
                            Wins = Wins + 1,
                            BestTurns = CASE WHEN @Turns < BestTurns THEN @Turns ELSE BestTurns END,
                            LastDefeatedAt = GETDATE()
                        WHERE UserId = @UserId AND NpcId = @NpcId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                        VALUES (@UserId, @NpcId, 1, 0, @Turns, GETDATE());
                    END
                END
                ELSE
                BEGIN
                    -- Registrar récord de derrota
                    IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UserId AND NpcId = @NpcId)
                    BEGIN
                        UPDATE dbo.UserNpcRecords SET Losses = Losses + 1 WHERE UserId = @UserId AND NpcId = @NpcId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.UserNpcRecords (UserId, NpcId, Wins, Losses, BestTurns, LastDefeatedAt)
                        VALUES (@UserId, @NpcId, 0, 1, @Turns, NULL);
                    END
                END

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @IsWinner AS IsWinner,
                    @IsFirstTimeWin AS IsFirstTimeWin,
                    @MedalUnlocked AS MedalUnlocked,
                    @UnlockedMedalCode AS UnlockedMedalCode,
                    @UnlockedMedalName AS UnlockedMedalName,
                    @IsNewNpcUnlocked AS IsNewNpcUnlocked,
                    @CurrentMax AS MaxNpcUnlocked;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51022, @ErrMsg, 1;
            END CATCH
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ResponderSolicitudClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ResponderSolicitudClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ResponderSolicitudClan];
GO
CREATE   PROCEDURE dbo.sp_ResponderSolicitudClan
    @ClanId INT,
    @AdminUserId INT,
    @TargetUserId INT,
    @Action VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AdminRole VARCHAR(20);
    SELECT @AdminRole = Role FROM dbo.ClanMembers WHERE ClanId = @ClanId AND UserId = @AdminUserId;

    IF @AdminRole IS NULL OR (@AdminRole <> 'Lider' AND @AdminRole <> 'Colider')
    BEGIN
        SELECT 0 AS Success, 'No tienes permisos para responder solicitudes de clan.' AS Message;
        RETURN;
    END

    IF @Action = 'ACCEPT'
    BEGIN
        DECLARE @CurrentCount INT, @MaxMembers INT;
        SELECT @MaxMembers = ISNULL(MaxMembers, 30),
               @CurrentCount = (SELECT COUNT(1) FROM dbo.ClanMembers WHERE ClanId = @ClanId)
        FROM dbo.Clans WHERE Id = @ClanId;

        IF @CurrentCount >= @MaxMembers
        BEGIN
            SELECT 0 AS Success, 'El clan ya alcanzÃ³ el cupo mÃ¡ximo de 30 miembros.' AS Message;
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM dbo.ClanMembers WHERE UserId = @TargetUserId)
        BEGIN
            UPDATE dbo.ClanJoinRequests SET Status = 'CANCELLED', RespondedAt = GETDATE()
            WHERE ClanId = @ClanId AND UserId = @TargetUserId;
            SELECT 0 AS Success, 'El duelista ya pertenece a otro clan actualmente.' AS Message;
            RETURN;
        END

        BEGIN TRANSACTION;
        BEGIN TRY
            INSERT INTO dbo.ClanMembers (ClanId, UserId, Role, ContributedExp, JoinedAt)
            VALUES (@ClanId, @TargetUserId, 'Miembro', 0, GETDATE());

            UPDATE dbo.ClanJoinRequests 
            SET Status = 'ACCEPTED', RespondedAt = GETDATE()
            WHERE ClanId = @ClanId AND UserId = @TargetUserId;

            DELETE FROM dbo.ClanJoinRequests WHERE UserId = @TargetUserId AND ClanId <> @ClanId;

            COMMIT TRANSACTION;
            SELECT 1 AS Success, 'Solicitud aceptada. Â¡Nuevo miembro unido al clan!' AS Message;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
        END CATCH
    END
    ELSE IF @Action = 'REJECT'
    BEGIN
        UPDATE dbo.ClanJoinRequests 
        SET Status = 'REJECTED', RespondedAt = GETDATE()
        WHERE ClanId = @ClanId AND UserId = @TargetUserId;

        SELECT 1 AS Success, 'Solicitud rechazada correctamente.' AS Message;
    END
    ELSE
    BEGIN
        SELECT 0 AS Success, 'AcciÃ³n no reconocida.' AS Message;
    END
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_SaveUserDeck]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_SaveUserDeck]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_SaveUserDeck];
GO

            CREATE   PROCEDURE dbo.sp_SaveUserDeck
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
        
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_SolicitarIngresoClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_SolicitarIngresoClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_SolicitarIngresoClan];
GO
CREATE   PROCEDURE dbo.sp_SolicitarIngresoClan
    @ClanId INT,
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @PlayerLvl INT, @Cooldown DATETIME;
    SELECT @PlayerLvl = ISNULL(Nivel, 1), @Cooldown = ClanCooldownUntil
    FROM dbo.Usuarios WHERE Id = @UserId AND IsActive = 1;

    IF @PlayerLvl IS NULL
    BEGIN
        SELECT 0 AS Success, 'Usuario no encontrado o inactivo.' AS Message;
        RETURN;
    END

    IF @Cooldown IS NOT NULL AND @Cooldown > GETDATE()
    BEGIN
        DECLARE @MinsLeft INT = DATEDIFF(MINUTE, GETDATE(), @Cooldown);
        DECLARE @H INT = @MinsLeft / 60;
        DECLARE @M INT = @MinsLeft % 60;
        SELECT 0 AS Success, 
               'Tienes una penalizaciÃ³n activa por retiro de clan. PodrÃ¡s unirte a un clan en ' + CAST(@H AS VARCHAR) + 'h ' + CAST(@M AS VARCHAR) + 'm.' AS Message;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.ClanMembers WHERE UserId = @UserId)
    BEGIN
        SELECT 0 AS Success, 'Ya perteneces a un clan.' AS Message;
        RETURN;
    END

    DECLARE @MinLvl INT, @MaxMembers INT, @CurrentMembers INT, @ClanName VARCHAR(20);
    SELECT 
        @ClanName = Name,
        @MinLvl = ISNULL(MinLevelReq, 1),
        @MaxMembers = ISNULL(MaxMembers, 30),
        @CurrentMembers = (SELECT COUNT(1) FROM dbo.ClanMembers cm WHERE cm.ClanId = c.Id)
    FROM dbo.Clans c
    WHERE c.Id = @ClanId AND c.IsActive = 1;

    IF @ClanName IS NULL
    BEGIN
        SELECT 0 AS Success, 'El clan seleccionado no existe o estÃ¡ inactivo.' AS Message;
        RETURN;
    END

    IF @CurrentMembers >= @MaxMembers
    BEGIN
        SELECT 0 AS Success, 'El clan ya alcanzÃ³ el lÃ­mite mÃ¡ximo de 30 duelistas.' AS Message;
        RETURN;
    END

    IF @PlayerLvl < @MinLvl
    BEGIN
        SELECT 0 AS Success, 
               'No cumples con el nivel mÃ­nimo requerido (Nv. ' + CAST(@MinLvl AS VARCHAR) + '). Tu nivel actual es Nv. ' + CAST(@PlayerLvl AS VARCHAR) + '.' AS Message;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.ClanJoinRequests WHERE ClanId = @ClanId AND UserId = @UserId)
    BEGIN
        DECLARE @Status VARCHAR(20);
        SELECT @Status = Status FROM dbo.ClanJoinRequests WHERE ClanId = @ClanId AND UserId = @UserId;
        IF @Status = 'PENDING'
        BEGIN
            SELECT 0 AS Success, 'Ya tienes una solicitud pendiente para ingresar a este clan.' AS Message;
            RETURN;
        END
        ELSE
        BEGIN
            UPDATE dbo.ClanJoinRequests 
            SET Status = 'PENDING', CreatedAt = GETDATE(), RespondedAt = NULL
            WHERE ClanId = @ClanId AND UserId = @UserId;
        END
    END
    ELSE
    BEGIN
        INSERT INTO dbo.ClanJoinRequests (ClanId, UserId, Status, CreatedAt)
        VALUES (@ClanId, @UserId, 'PENDING', GETDATE());
    END

    SELECT 1 AS Success, 'Solicitud enviada exitosamente al clan "' + @ClanName + '".' AS Message;
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_UpdateBoosterPack]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_UpdateBoosterPack]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_UpdateBoosterPack];
GO
CREATE   PROCEDURE dbo.sp_UpdateBoosterPack
                @PackId NVARCHAR(50),
                @IsActive BIT,
                @IsVisible BIT = 1,
                @Price INT = 1500,
                @OfferText NVARCHAR(100) = NULL
            AS
            BEGIN
                SET NOCOUNT ON;
                IF EXISTS (SELECT 1 FROM dbo.BoosterPacks WHERE PackId = @PackId)
                BEGIN
                    UPDATE dbo.BoosterPacks
                    SET 
                        IsActive = @IsActive,
                        IsVisible = @IsVisible,
                        Price = @Price,
                        OfferText = @OfferText,
                        UpdatedAt = GETDATE()
                    WHERE PackId = @PackId;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.BoosterPacks (PackId, Name, Code, Price, OfferText, IsActive, IsVisible, UpdatedAt)
                    VALUES (@PackId, @PackId, @PackId, @Price, @OfferText, @IsActive, @IsVisible, GETDATE());
                END

                SELECT * FROM dbo.BoosterPacks WHERE PackId = @PackId;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_UpdateCardOverride]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_UpdateCardOverride]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_UpdateCardOverride];
GO
CREATE   PROCEDURE dbo.sp_UpdateCardOverride
                @PackId NVARCHAR(50),
                @CardId INT,
                @IsActive BIT = 1,
                @PackDrop BIT = 1,
                @DeckUsable BIT = 1,
                @NpcDrop BIT = 1
            AS
            BEGIN
                SET NOCOUNT ON;
                MERGE dbo.PackCardOverrides AS target
                USING (SELECT @PackId AS PackId, @CardId AS CardId) AS source
                ON (target.PackId = source.PackId AND target.CardId = source.CardId)
                WHEN MATCHED THEN
                    UPDATE SET 
                        IsActive = @IsActive,
                        PackDrop = @PackDrop,
                        DeckUsable = @DeckUsable,
                        NpcDrop = @NpcDrop,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (PackId, CardId, IsActive, PackDrop, DeckUsable, NpcDrop, UpdatedAt)
                    VALUES (@PackId, @CardId, @IsActive, @PackDrop, @DeckUsable, @NpcDrop, GETDATE());

                SELECT * FROM dbo.PackCardOverrides WHERE PackId = @PackId AND CardId = @CardId;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_ValidarRequisitosDuelo]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_ValidarRequisitosDuelo]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_ValidarRequisitosDuelo];
GO
CREATE   PROCEDURE dbo.sp_ValidarRequisitosDuelo
                @UserId INT = NULL,
                @Username NVARCHAR(50) = NULL,
                @MinLevel INT = 1,
                @MaxLevel INT = 999,
                @RequiredStarships BIGINT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                
                DECLARE @DbId INT, @DbUser NVARCHAR(50), @Level INT, @Stars BIGINT, @Exp INT;

                SELECT 
                    @DbId = Id, 
                    @DbUser = Username, 
                    @Level = ISNULL(Nivel, 1), 
                    @Stars = ISNULL(Starships, 0),
                    @Exp = ISNULL(Experiencia, 0)
                FROM dbo.Usuarios 
                WHERE (@UserId IS NOT NULL AND Id = @UserId)
                   OR (@Username IS NOT NULL AND Username = @Username);

                IF @DbId IS NULL
                BEGIN
                    SELECT 
                        0 AS IsValid,
                        'Usuario no encontrado en la base de datos.' AS Message,
                        0 AS Nivel,
                        0 AS Starships,
                        0 AS Experiencia;
                    RETURN;
                END

                -- Validar Nivel
                IF @Level < @MinLevel OR @Level > @MaxLevel
                BEGIN
                    SELECT 
                        0 AS IsValid,
                        CONCAT('âš ï¸ Tu nivel actual (Nv. ', @Level, ') no cumple con el rango requerido (Nv. ', @MinLevel, ' - Nv. ', @MaxLevel, ').') AS Message,
                        @Level AS Nivel,
                        @Stars AS Starships,
                        @Exp AS Experiencia;
                    RETURN;
                END

                -- Validar Starships
                IF @RequiredStarships > 0 AND @Stars < @RequiredStarships
                BEGIN
                    SELECT 
                        0 AS IsValid,
                        CONCAT('âš ï¸ No posees suficientes Starships (', FORMAT(@Stars, 'N0'), ' / ', FORMAT(@RequiredStarships, 'N0'), ' â˜…) para cubrir el respaldo de este duelo.') AS Message,
                        @Level AS Nivel,
                        @Stars AS Starships,
                        @Exp AS Experiencia;
                    RETURN;
                END

                -- Todo vÃ¡lido
                SELECT 
                    1 AS IsValid,
                    'Requisitos cumplidos exitosamente.' AS Message,
                    @Level AS Nivel,
                    @Stars AS Starships,
                    @Exp AS Experiencia;
            END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_VenderCartaRepetida]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_VenderCartaRepetida]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_VenderCartaRepetida];
GO

        CREATE   PROCEDURE dbo.sp_VenderCartaRepetida
            @UsuarioId INT,
            @CardCode INT
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @Qty INT;
                SELECT @Qty = Quantity 
                FROM dbo.UserCardsSql WITH (UPDLOCK, ROWLOCK) 
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;

                IF @Qty IS NULL OR @Qty <= 0
                BEGIN
                    THROW 51020, 'No posees copias de esta carta para vender.', 1;
                END

                -- Verificar si la carta está en el mazo activo
                DECLARE @InDeckCount INT = 0;
                SELECT @InDeckCount = COUNT(*) 
                FROM dbo.DeckCards dc
                INNER JOIN dbo.Decks d ON dc.DeckId = d.Id
                WHERE d.UsuarioId = @UsuarioId AND d.EsActivo = 1 AND dc.CardCode = @CardCode;

                IF @InDeckCount = 0
                BEGIN
                    SELECT @InDeckCount = CASE WHEN MainDeckJson LIKE '%' + CAST(@CardCode AS VARCHAR(20)) + '%' THEN 1 ELSE 0 END
                    FROM dbo.Decks
                    WHERE UsuarioId = @UsuarioId AND EsActivo = 1;
                END

                IF @Qty <= @InDeckCount
                BEGIN
                    THROW 51020, 'No puedes vender esta carta porque está equipada en tu Mazo activo. Quítala del mazo primero.', 1;
                END

                -- Descontar 1 copia
                UPDATE dbo.UserCardsSql
                SET Quantity = Quantity - 1
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode;

                DELETE FROM dbo.UserCardsSql 
                WHERE UsuarioId = @UsuarioId AND CardCode = @CardCode AND Quantity <= 0;

                -- Abonar 100 estrellas al usuario
                UPDATE dbo.Usuarios
                SET Starships = Starships + 100
                WHERE Id = @UsuarioId;

                INSERT INTO dbo.StarshipTransactions (UserId, Amount, Description, TransactionType, CreatedAt)
                VALUES (@UsuarioId, 100, 'Venta de carta #' + CAST(@CardCode AS VARCHAR(20)), 'CARD_SALE', GETDATE());

                DECLARE @NewBalance BIGINT;
                SELECT @NewBalance = Starships FROM dbo.Usuarios WHERE Id = @UsuarioId;

                DECLARE @RemainingQty INT = @Qty - 1;

                COMMIT TRANSACTION;

                SELECT 
                    1 AS Success,
                    @RemainingQty AS RemainingQuantity,
                    @NewBalance AS NewBalance,
                    100 AS PaidAmount,
                    'Has vendido 1 copia por 100 estrellas.' AS Message;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrSell NVARCHAR(4000) = ERROR_MESSAGE();
                THROW 51021, @ErrSell, 1;
            END CATCH
        END;
    
GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_VerificarPenalizacionClan]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_VerificarPenalizacionClan]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_VerificarPenalizacionClan];
GO
CREATE   PROCEDURE dbo.sp_VerificarPenalizacionClan
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CooldownUntil DATETIME;
    SELECT @CooldownUntil = ClanCooldownUntil FROM dbo.Usuarios WHERE Id = @UserId;

    IF @CooldownUntil IS NOT NULL AND @CooldownUntil > GETDATE()
    BEGIN
        DECLARE @DiffMinutes INT = DATEDIFF(MINUTE, GETDATE(), @CooldownUntil);
        DECLARE @Hours INT = @DiffMinutes / 60;
        DECLARE @Minutes INT = @DiffMinutes % 60;

        SELECT 
            1 AS HasCooldown,
            @CooldownUntil AS CooldownUntil,
            @Hours AS RemainingHours,
            @Minutes AS RemainingMinutes,
            'Tienes una penalizaciÃ³n activa por retiro de clan. Espera ' + CAST(@Hours AS VARCHAR) + 'h ' + CAST(@Minutes AS VARCHAR) + 'm para fundar o unirte a un clan.' AS Message;
    END
    ELSE
    BEGIN
        SELECT 
            0 AS HasCooldown,
            NULL AS CooldownUntil,
            0 AS RemainingHours,
            0 AS RemainingMinutes,
            'Sin penalizaciÃ³n activa.' AS Message;
    END
END;

GO

-- --------------------------------------------------------------------
-- Stored Procedure: [sp_VerificarSesionYRol]
-- --------------------------------------------------------------------
IF OBJECT_ID('[dbo].[sp_VerificarSesionYRol]', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_VerificarSesionYRol];
GO

            CREATE   PROCEDURE dbo.sp_VerificarSesionYRol
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
        
GO

