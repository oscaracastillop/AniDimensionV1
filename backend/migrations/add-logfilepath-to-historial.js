const { getPool } = require('../config/db');

async function migrate() {
    try {
        const pool = await getPool();
        console.log('[MIGRATION] Añadiendo columna LogFilePath a dbo.HistorialDuelos...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.HistorialDuelos') AND name = 'LogFilePath')
            BEGIN
                ALTER TABLE dbo.HistorialDuelos ADD LogFilePath NVARCHAR(255) NULL;
            END
        `);

        console.log('[MIGRATION] Actualizando dbo.sp_RegistrarResultadoDuelo con @LogFilePath...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_RegistrarResultadoDuelo
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
        `);

        console.log('[MIGRATION EXITOSA] LogFilePath configurado en SQL Server.');
        process.exit(0);
    } catch (e) {
        console.error('[MIGRATION ERROR]', e);
        process.exit(1);
    }
}

migrate();
