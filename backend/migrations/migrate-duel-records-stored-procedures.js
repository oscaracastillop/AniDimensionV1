/**
 * Migración: Stored Procedures para Registro Completo y Consulta de Historial de Duelos (NPC & PvP)
 * Base de Datos: AniDimensionDB (SQL Server)
 */
const { getPool, sql } = require('../config/db');

async function migrateDuelRecordsStoredProcedures() {
    console.log('🚀 [MIGRACIÓN HISTORIAL DUELOS] Compilando tablas y Stored Procedures para Duelos NPC y PvP...');
    try {
        const pool = await getPool();

        // 1. Asegurar columnas completas en dbo.HistorialDuelos
        console.log('⚡ Verificando columnas de dbo.HistorialDuelos...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'Username')
                ALTER TABLE dbo.HistorialDuelos ADD Username NVARCHAR(50) NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'RivalId')
                ALTER TABLE dbo.HistorialDuelos ADD RivalId INT NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'NpcId')
                ALTER TABLE dbo.HistorialDuelos ADD NpcId INT NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'ExpPerdida')
                ALTER TABLE dbo.HistorialDuelos ADD ExpPerdida INT NOT NULL CONSTRAINT DF_HD_ExpPerdida DEFAULT 0;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'StarshipsPerdidas')
                ALTER TABLE dbo.HistorialDuelos ADD StarshipsPerdidas BIGINT NOT NULL CONSTRAINT DF_HD_StarshipsPerdidas DEFAULT 0;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'CardDropNombre')
                ALTER TABLE dbo.HistorialDuelos ADD CardDropNombre NVARCHAR(150) NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'NivelJugador')
                ALTER TABLE dbo.HistorialDuelos ADD NivelJugador INT NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'NivelRival')
                ALTER TABLE dbo.HistorialDuelos ADD NivelRival INT NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'Turnos')
                ALTER TABLE dbo.HistorialDuelos ADD Turnos INT NULL;

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'HistorialDuelos' AND COLUMN_NAME = 'MotivoFin')
                ALTER TABLE dbo.HistorialDuelos ADD MotivoFin NVARCHAR(50) NULL;
        `);

        // 2. dbo.sp_RegistrarResultadoDuelo (Inserta historial completo y actualiza estadísticas)
        console.log('⚡ Compilando dbo.sp_RegistrarResultadoDuelo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_RegistrarResultadoDuelo
                @UsuarioId INT,
                @Username NVARCHAR(50) = NULL,
                @RivalId INT = NULL,
                @RivalNombre NVARCHAR(100),
                @NpcId INT = NULL,
                @EsPvp BIT = 0,
                @EsVictoria BIT = 0,
                @ExpGanada INT = 0,
                @ExpPerdida INT = 0,
                @StarshipsGanadas BIGINT = 0,
                @StarshipsPerdidas BIGINT = 0,
                @CardDropCode INT = NULL,
                @CardDropNombre NVARCHAR(150) = NULL,
                @NivelJugador INT = 1,
                @NivelRival INT = 1,
                @Turnos INT = 1,
                @MotivoFin NVARCHAR(50) = 'LP_ZERO'
            AS
            BEGIN
                SET NOCOUNT ON;
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- Obtener Username si no se envió
                    IF @Username IS NULL OR @Username = ''
                    BEGIN
                        SELECT @Username = Username FROM dbo.Usuarios WHERE Id = @UsuarioId;
                    END

                    -- 1. Insertar en dbo.HistorialDuelos
                    INSERT INTO dbo.HistorialDuelos (
                        UsuarioId, Username, RivalId, RivalNombre, NpcId,
                        EsPvp, EsVictoria, ExpGanada, ExpPerdida,
                        StarshipsGanadas, StarshipsPerdidas, CardDropCode, CardDropNombre,
                        NivelJugador, NivelRival, Turnos, MotivoFin, Fecha
                    )
                    VALUES (
                        @UsuarioId, @Username, @RivalId, @RivalNombre, @NpcId,
                        @EsPvp, @EsVictoria, @ExpGanada, @ExpPerdida,
                        @StarshipsGanadas, @StarshipsPerdidas, @CardDropCode, @CardDropNombre,
                        @NivelJugador, @NivelRival, @Turnos, @MotivoFin, GETDATE()
                    );

                    -- 2. Si es duelo contra NPC, actualizar récord específico en dbo.UserNpcRecords
                    IF @EsPvp = 0 AND @NpcId IS NOT NULL AND @NpcId > 0
                    BEGIN
                        IF EXISTS (SELECT 1 FROM dbo.UserNpcRecords WHERE UserId = @UsuarioId AND NpcId = @NpcId)
                        BEGIN
                            IF @EsVictoria = 1
                            BEGIN
                                UPDATE dbo.UserNpcRecords 
                                SET Wins = Wins + 1, 
                                    BestTurns = CASE WHEN BestTurns IS NULL OR @Turnos < BestTurns THEN @Turnos ELSE BestTurns END,
                                    LastDefeatedAt = GETDATE()
                                WHERE UserId = @UsuarioId AND NpcId = @NpcId;
                            END
                            ELSE
                            BEGIN
                                UPDATE dbo.UserNpcRecords 
                                SET Losses = Losses + 1
                                WHERE UserId = @UsuarioId AND NpcId = @NpcId;
                            END
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
        `);

        // 3. dbo.sp_ObtenerEstadisticasDuelosUsuario
        console.log('⚡ Compilando dbo.sp_ObtenerEstadisticasDuelosUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ObtenerEstadisticasDuelosUsuario
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

                -- Estadísticas Agregadas
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

                -- Historial detallado de los últimos 30 duelos
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
        `);

        console.log('✅ [MIGRACIÓN HISTORIAL DUELOS] Procedimientos dbo.sp_RegistrarResultadoDuelo y dbo.sp_ObtenerEstadisticasDuelosUsuario compilados exitosamente.');
    } catch (err) {
        console.error('❌ [ERROR MIGRACIÓN HISTORIAL DUELOS]', err);
        throw err;
    }
}

if (require.main === module) {
    migrateDuelRecordsStoredProcedures().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrateDuelRecordsStoredProcedures };
