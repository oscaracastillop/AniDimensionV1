const { getPool, sql } = require('../config/db');

async function migrate() {
    console.log('⚡ Creando/Actualizando conjunto completo de Procedimientos Almacenados de Clanes en SQL Server...');
    const pool = await getPool();

    // 1. Columna ClanCooldownUntil en dbo.Usuarios
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'ClanCooldownUntil'
        )
        BEGIN
            ALTER TABLE dbo.Usuarios ADD ClanCooldownUntil DATETIME NULL;
            PRINT 'Columna ClanCooldownUntil añadida a dbo.Usuarios.';
        END
    `);

    // 2. dbo.sp_ObtenerListaClanes
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerListaClanes
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

    -- 2. Membresía y Solicitudes del Usuario si @UserId > 0
    IF @UserId > 0
    BEGIN
        SELECT ClanId FROM dbo.ClanMembers WHERE UserId = @UserId;
        SELECT ClanId, Status FROM dbo.ClanJoinRequests WHERE UserId = @UserId AND Status = 'PENDING';
        SELECT ClanCooldownUntil FROM dbo.Usuarios WHERE Id = @UserId;
    END
END;
    `);
    console.log('✅ dbo.sp_ObtenerListaClanes listo');

    // 3. dbo.sp_ObtenerMiClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerMiClan
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
        -- Retornar información si tiene penalización activa
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
        ISNULL(co.FlagEmoji, '🌐') as FlagEmoji,
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

    -- 3. Solicitudes Pendientes (solo si es Líder o Colíder)
    IF @MyRole = 'Lider' OR @MyRole = 'Colider'
    BEGIN
        SELECT 
            cjr.Id as RequestId, cjr.UserId, cjr.CreatedAt as RequestedAt,
            u.Username, 
            ISNULL(u.Nivel, 1) as Nivel, 
            ISNULL(u.AvatarActivoId, 'AVA-002') as AvatarActivoId,
            ISNULL(u.CountryIsoCode, 'UN') as CountryIsoCode,
            ISNULL(co.FlagEmoji, '🌐') as FlagEmoji,
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
    `);
    console.log('✅ dbo.sp_ObtenerMiClan listo');

    // 4. dbo.sp_CrearClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_CrearClan
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
               'Tienes una penalización activa por retiro de clan. Podrás fundar o unirte a un clan en ' + CAST(@H AS VARCHAR) + 'h ' + CAST(@M AS VARCHAR) + 'm.' AS Message,
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
        SELECT 0 AS Success, 'Ese nombre de clan ya está registrado. Por favor elige otro.' AS Message, 0 AS ClanId, @CurrentStars AS RemainingStarships;
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
            @MinLevelReq, ISNULL(@NoticeMessage, '¡Bienvenidos al clan oficial!'), 30, 0, GETDATE(), 1
        );

        DECLARE @NewClanId INT = SCOPE_IDENTITY();

        INSERT INTO dbo.ClanMembers (ClanId, UserId, Role, ContributedExp, JoinedAt)
        VALUES (@NewClanId, @UserId, 'Lider', 0, GETDATE());

        DELETE FROM dbo.ClanJoinRequests WHERE UserId = @UserId;

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            '¡Clan "' + @Name + '" fundado exitosamente! Se han descontado 50,000 StarShips.' AS Message,
            @NewClanId AS ClanId,
            (@CurrentStars - 50000) AS RemainingStarships;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message, 0 AS ClanId, @CurrentStars AS RemainingStarships;
    END CATCH
END;
    `);
    console.log('✅ dbo.sp_CrearClan listo');

    // 5. dbo.sp_SolicitarIngresoClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_SolicitarIngresoClan
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
               'Tienes una penalización activa por retiro de clan. Podrás unirte a un clan en ' + CAST(@H AS VARCHAR) + 'h ' + CAST(@M AS VARCHAR) + 'm.' AS Message;
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
        SELECT 0 AS Success, 'El clan seleccionado no existe o está inactivo.' AS Message;
        RETURN;
    END

    IF @CurrentMembers >= @MaxMembers
    BEGIN
        SELECT 0 AS Success, 'El clan ya alcanzó el límite máximo de 30 duelistas.' AS Message;
        RETURN;
    END

    IF @PlayerLvl < @MinLvl
    BEGIN
        SELECT 0 AS Success, 
               'No cumples con el nivel mínimo requerido (Nv. ' + CAST(@MinLvl AS VARCHAR) + '). Tu nivel actual es Nv. ' + CAST(@PlayerLvl AS VARCHAR) + '.' AS Message;
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
    `);
    console.log('✅ dbo.sp_SolicitarIngresoClan listo');

    // 6. dbo.sp_ResponderSolicitudClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ResponderSolicitudClan
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
            SELECT 0 AS Success, 'El clan ya alcanzó el cupo máximo de 30 miembros.' AS Message;
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
            SELECT 1 AS Success, 'Solicitud aceptada. ¡Nuevo miembro unido al clan!' AS Message;
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
        SELECT 0 AS Success, 'Acción no reconocida.' AS Message;
    END
END;
    `);
    console.log('✅ dbo.sp_ResponderSolicitudClan listo');

    // 7. dbo.sp_AbandonarClan (Con Penalización de 24 horas)
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_AbandonarClan
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
                   'Como Líder, debes transferir el liderazgo a otro miembro antes de abandonar el clan, o disolver el clan si deseas eliminarlo por completo.' AS Message;
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
                       'Has abandonado y disuelto el clan. Se ha aplicado una penalización de espera de 24 horas antes de poder fundar o unirte a otro clan.' AS Message;
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
               'Has abandonado el clan exitosamente. Se ha aplicado una penalización de espera de 24 horas antes de poder fundar o unirte a otro clan.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;
    `);
    console.log('✅ dbo.sp_AbandonarClan listo');

    // 8. dbo.sp_DisolverClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_DisolverClan
    @ClanId INT,
    @LeaderUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LeaderCheck INT;
    SELECT @LeaderCheck = LeaderUserId FROM dbo.Clans WHERE Id = @ClanId;

    IF @LeaderCheck IS NULL OR @LeaderCheck <> @LeaderUserId
    BEGIN
        SELECT 0 AS Success, 'Solo el Líder Fundador puede disolver el clan.' AS Message;
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
    `);
    console.log('✅ dbo.sp_DisolverClan listo');

    // 9. dbo.sp_ExpulsarMiembroClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ExpulsarMiembroClan
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
        SELECT 0 AS Success, 'No se puede expulsar al Líder Fundador del clan.' AS Message;
        RETURN;
    END

    IF @AdminRole = 'Colider' AND @TargetRole = 'Colider'
    BEGIN
        SELECT 0 AS Success, 'Un Colíder no puede expulsar a otro Colíder.' AS Message;
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
    `);
    console.log('✅ dbo.sp_ExpulsarMiembroClan listo');

    // 10. dbo.sp_ActualizarConfigClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ActualizarConfigClan
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
        SELECT 0 AS Success, 'No tienes permisos para modificar la configuración del clan.' AS Message;
        RETURN;
    END

    UPDATE dbo.Clans
    SET 
        NoticeMessage = ISNULL(@NoticeMessage, NoticeMessage),
        MinLevelReq = ISNULL(@MinLevelReq, MinLevelReq),
        Tag = ISNULL(@Tag, Tag)
    WHERE Id = @ClanId;

    SELECT 1 AS Success, 'Configuración del clan actualizada correctamente.' AS Message;
END;
    `);
    console.log('✅ dbo.sp_ActualizarConfigClan listo');

    // 11. dbo.sp_CambiarRolClan
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_CambiarRolClan
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
        SELECT 0 AS Success, 'Solo el Líder Fundador puede cambiar rangos en el clan.' AS Message;
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
    `);
    console.log('✅ dbo.sp_CambiarRolClan listo');

    console.log('🎉 [MIGRACIÓN CLANES SP] ¡Todos los Stored Procedures de Clanes compilados exitosamente!');
}

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ [MIGRACIÓN ERROR]', err);
            process.exit(1);
        });
}

module.exports = { migrate };
