/**
 * Migración: Creación y compilación de Procedimientos Almacenados para el Sistema de Torneos y Eventos
 * Base de Datos: AniDimensionDB (SQL Server)
 */
const { getPool, sql } = require('../config/db');

async function migrateTournamentStoredProcedures() {
    console.log('🚀 [MIGRACIÓN TORNEOS] Iniciando compilación de Stored Procedures...');
    try {
        const pool = await getPool();

        // SP 1: dbo.sp_ObtenerTorneos
        console.log('⚡ Compilando dbo.sp_ObtenerTorneos...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerTorneos
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
        `);

        // SP 2: dbo.sp_ObtenerDetalleTorneo
        console.log('⚡ Compilando dbo.sp_ObtenerDetalleTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerDetalleTorneo
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
        `);

        // SP 3: dbo.sp_CrearTorneo
        console.log('⚡ Compilando dbo.sp_CrearTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_CrearTorneo
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
        `);

        // SP 4: dbo.sp_ModificarTorneo
        console.log('⚡ Compilando dbo.sp_ModificarTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ModificarTorneo
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
        `);

        // SP 5: dbo.sp_EliminarTorneo
        console.log('⚡ Compilando dbo.sp_EliminarTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_EliminarTorneo
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
        `);

        // SP 6: dbo.sp_InscribirJugadorTorneo (Transaccional atómico con validaciones y deducción de Starships)
        console.log('⚡ Compilando dbo.sp_InscribirJugadorTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_InscribirJugadorTorneo
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
                        RAISERROR('Las inscripciones para este torneo no están abiertas.', 16, 1);
                        RETURN;
                    END

                    -- 2. Validar Cupos
                    DECLARE @TotalInscritos INT;
                    SELECT @TotalInscritos = COUNT(*) FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId;
                    IF @TotalInscritos >= @MaxPart
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('El cupo máximo de participantes ya ha sido alcanzado.', 16, 1);
                        RETURN;
                    END

                    -- 3. Validar si ya está inscrito
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
                        RAISERROR('No tienes suficientes Starships para pagar la inscripción.', 16, 1);
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
        `);

        // SP 7: dbo.sp_DesinscribirJugadorTorneo (Reembolso atómico)
        console.log('⚡ Compilando dbo.sp_DesinscribirJugadorTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_DesinscribirJugadorTorneo
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
                        RAISERROR('No puedes cancelar tu inscripción una vez cerrado el registro.', 16, 1);
                        RETURN;
                    END

                    IF NOT EXISTS (SELECT 1 FROM dbo.TorneoParticipantes WHERE TorneoId = @TorneoId AND UserId = @UserId)
                    BEGIN
                        ROLLBACK TRANSACTION;
                        RAISERROR('No estás inscrito en este torneo.', 16, 1);
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
        `);

        // SP 8: dbo.sp_EntregarPremiosTorneo
        console.log('⚡ Compilando dbo.sp_EntregarPremiosTorneo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_EntregarPremiosTorneo
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
        `);

        console.log('✅ [MIGRACIÓN TORNEOS] Todos los Procedimientos Almacenados de Torneos fueron compilados exitosamente en AniDimensionDB.');
    } catch (err) {
        console.error('❌ [ERROR MIGRACIÓN TORNEOS]', err);
        throw err;
    }
}

if (require.main === module) {
    migrateTournamentStoredProcedures().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrateTournamentStoredProcedures };
