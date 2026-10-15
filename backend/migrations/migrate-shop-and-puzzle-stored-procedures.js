const { getPool, sql } = require('../config/db');

async function migrate() {
    console.log('⚡ Iniciando migración de Procedimientos Almacenados de Tienda y Rompecabezas en SQL Server...');
    const pool = await getPool();

    // =========================================================================
    // 1. TABLAS DE EVENTOS DE ROMPECABEZAS EN SQL SERVER
    // =========================================================================
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle' AND xtype='U')
        CREATE TABLE dbo.Events_Puzzle (
            id INT IDENTITY(1,1) PRIMARY KEY,
            title NVARCHAR(255) NOT NULL,
            description NVARCHAR(MAX),
            image_url NVARCHAR(500) NOT NULL,
            start_date DATETIME2 NOT NULL,
            end_date DATETIME2 NOT NULL,
            grid_rows INT DEFAULT 4,
            grid_cols INT DEFAULT 4,
            total_pieces INT DEFAULT 16,
            payout_per_leftover_piece INT DEFAULT 50,
            drop_rate_npc FLOAT DEFAULT 0.40,
            drop_rate_pvp FLOAT DEFAULT 0.75,
            prizes_config NVARCHAR(MAX),
            is_active BIT DEFAULT 1,
            created_at DATETIME2 DEFAULT SYSUTCDATETIME()
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Pieces' AND xtype='U')
        CREATE TABLE dbo.Events_Puzzle_Pieces (
            id INT IDENTITY(1,1) PRIMARY KEY,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            piece_index INT NOT NULL,
            quantity INT DEFAULT 1,
            updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            CONSTRAINT UQ_User_Event_Piece UNIQUE (event_id, user_id, piece_index)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Winners' AND xtype='U')
        CREATE TABLE dbo.Events_Puzzle_Winners (
            id INT IDENTITY(1,1) PRIMARY KEY,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            username NVARCHAR(100),
            position INT NOT NULL,
            completed_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            prize_data NVARCHAR(MAX),
            delivered BIT DEFAULT 0,
            CONSTRAINT UQ_User_Event_Winner UNIQUE (event_id, user_id)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Exchanges' AND xtype='U')
        CREATE TABLE dbo.Events_Puzzle_Exchanges (
            id INT IDENTITY(1,1) PRIMARY KEY,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            pieces_exchanged INT NOT NULL,
            starships_awarded INT NOT NULL,
            exchanged_at DATETIME2 DEFAULT SYSUTCDATETIME(),
            CONSTRAINT UQ_User_Event_Exchange UNIQUE (event_id, user_id)
        );
    `);
    console.log('✅ Tablas de Rompecabezas verificadas.');

    // =========================================================================
    // 2. STORED PROCEDURES DE TIENDA Y COSMÉTICOS
    // =========================================================================

    // SP: dbo.sp_ComprarCosmetico (Con soporte completo de Boosts para Avatares, Tapetes, Fundas y VIP)
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
        SELECT @CurrentStars = ISNULL(Starships, 0) FROM dbo.Usuarios WHERE Id = @UserId;

        IF @CurrentStars IS NULL
        BEGIN
            THROW 50030, 'Usuario no encontrado.', 1;
        END

        IF @CurrentStars < @CostStarships
        BEGIN
            THROW 50031, 'Saldo insuficiente de StarShips para realizar la compra.', 1;
        END

        -- Descontar saldo de Starships
        IF @CostStarships > 0
        BEGIN
            UPDATE dbo.Usuarios 
            SET Starships = Starships - @CostStarships 
            WHERE Id = @UserId;
        END

        -- Registrar cosmético en el inventario correspondiente
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
            -- Extensión de 30 días VIP
            DECLARE @BaseVip DATETIME;
            SELECT @BaseVip = VipUntil FROM dbo.Usuarios WHERE Id = @UserId;

            DECLARE @NewVipUntil DATETIME = DATEADD(DAY, 30, CASE WHEN @BaseVip IS NOT NULL AND @BaseVip > GETDATE() THEN @BaseVip ELSE GETDATE() END);

            UPDATE dbo.Usuarios 
            SET VipUntil = @NewVipUntil 
            WHERE Id = @UserId;

            INSERT INTO dbo.UserVipPasses (UsuarioId, VipCode, ExpiresAt, AcquiredAt)
            VALUES (@UserId, @ItemCode, @NewVipUntil, GETDATE());
        END

        DECLARE @NewBal BIGINT;
        SELECT @NewBal = Starships FROM dbo.Usuarios WHERE Id = @UserId;

        COMMIT TRANSACTION;

        SELECT 1 AS Success, @NewBal AS NewStarshipsBalance, 'Artículo adquirido y guardado en tu cuenta exitosamente.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50032, @ErrMsg, 1;
    END CATCH
END;
    `);
    console.log('✅ dbo.sp_ComprarCosmetico listo.');

    // SP: dbo.sp_EquiparCosmetico
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
            SELECT 1 AS Success, 'Avatar predeterminado activado.' AS Message;
            RETURN;
        END

        -- Si no existe en UserAvatars pero es uno inicial gratuito, auto-registrar
        IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @UserId AND AvatarCode = @ItemCode)
        BEGIN
            IF @ItemCode IN ('AVA-001', 'AVA-002', 'AVA-003', 'AVA-004', 'AVA-005')
            BEGIN
                INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt)
                VALUES (@UserId, @ItemCode, 0, 0, 0, 1, GETDATE());
            END
            ELSE
            BEGIN
                SELECT 0 AS Success, 'No posees este avatar en tu inventario.' AS Message;
                RETURN;
            END
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
            SELECT 1 AS Success, 'Tapete desactivado. Campo predeterminado activado.' AS Message;
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.UserPlaymats WHERE UsuarioId = @UserId AND PlaymatCode = @ItemCode)
        BEGIN
            -- Si es predeterminado
            IF @ItemCode IN ('default_mat', 'MAT-001')
            BEGIN
                INSERT INTO dbo.UserPlaymats (UsuarioId, PlaymatCode, AcquiredAt) VALUES (@UserId, @ItemCode, GETDATE());
            END
            ELSE
            BEGIN
                SELECT 0 AS Success, 'No posees este tapete en tu inventario.' AS Message;
                RETURN;
            END
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
            SELECT 1 AS Success, 'Funda desactivada. Reverso original activado.' AS Message;
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.UserSleeves WHERE UsuarioId = @UserId AND SleeveCode = @ItemCode)
        BEGIN
            IF @ItemCode IN ('default_sleeve', 'SLV-001')
            BEGIN
                INSERT INTO dbo.UserSleeves (UsuarioId, SleeveCode, AcquiredAt) VALUES (@UserId, @ItemCode, GETDATE());
            END
            ELSE
            BEGIN
                SELECT 0 AS Success, 'No posees esta funda en tu inventario.' AS Message;
                RETURN;
            END
        END

        UPDATE dbo.Usuarios SET FundaActivaId = @ItemCode WHERE Id = @UserId;
        SELECT 1 AS Success, 'Funda equipada exitosamente.' AS Message;
        RETURN;
    END

    SELECT 1 AS Success, 'Artículo actualizado.' AS Message;
END;
    `);
    console.log('✅ dbo.sp_EquiparCosmetico listo.');

    // =========================================================================
    // 3. STORED PROCEDURES DE ROMPECABEZAS
    // =========================================================================

    // SP: dbo.sp_ObtenerEstadoRompecabezasUsuario
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerEstadoRompecabezasUsuario
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
    `);
    console.log('✅ dbo.sp_ObtenerEstadoRompecabezasUsuario listo.');

    // SP: dbo.sp_EntregarFichaPuzzle
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_EntregarFichaPuzzle
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
    `);
    console.log('✅ dbo.sp_EntregarFichaPuzzle listo.');

    // SP: dbo.sp_CompletarRompecabezas
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_CompletarRompecabezas
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
    `);
    console.log('✅ dbo.sp_CompletarRompecabezas listo.');

    // SP: dbo.sp_CanjearFichasSobrantesPuzzle
    await pool.request().query(`
CREATE OR ALTER PROCEDURE dbo.sp_CanjearFichasSobrantesPuzzle
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
    `);
    console.log('✅ dbo.sp_CanjearFichasSobrantesPuzzle listo.');

    console.log('🎉 Migración de Tienda y Rompecabezas completada exitosamente.');
}

if (require.main === module) {
    migrate().then(() => process.exit(0)).catch(err => {
        console.error('❌ Error en migración:', err);
        process.exit(1);
    });
}

module.exports = { migrate };
