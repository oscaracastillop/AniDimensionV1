/**
 * Migración: Stored Procedures para Validación Pre-Duelo y Liquidación de Fin de Duelo PvP
 * Base de Datos: AniDimensionDB (SQL Server)
 */
const { getPool, sql } = require('../config/db');

async function migrateDuelValidationStoredProcedures() {
    console.log('🚀 [MIGRACIÓN DUELOS SP] Compilando Stored Procedures de Validación y Fin de Duelo...');
    try {
        const pool = await getPool();

        // 1. dbo.sp_ValidarRequisitosDuelo
        console.log('⚡ Compilando dbo.sp_ValidarRequisitosDuelo...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_ValidarRequisitosDuelo
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
                        CONCAT('⚠️ Tu nivel actual (Nv. ', @Level, ') no cumple con el rango requerido (Nv. ', @MinLevel, ' - Nv. ', @MaxLevel, ').') AS Message,
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
                        CONCAT('⚠️ No posees suficientes Starships (', FORMAT(@Stars, 'N0'), ' / ', FORMAT(@RequiredStarships, 'N0'), ' ★) para cubrir el respaldo de este duelo.') AS Message,
                        @Level AS Nivel,
                        @Stars AS Starships,
                        @Exp AS Experiencia;
                    RETURN;
                END

                -- Todo válido
                SELECT 
                    1 AS IsValid,
                    'Requisitos cumplidos exitosamente.' AS Message,
                    @Level AS Nivel,
                    @Stars AS Starships,
                    @Exp AS Experiencia;
            END;
        `);

        // 2. dbo.sp_RegistrarFinDueloPvP (Transacción ACID para Ganador y Perdedor)
        console.log('⚡ Compilando dbo.sp_RegistrarFinDueloPvP...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_RegistrarFinDueloPvP
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
        `);

        console.log('✅ [MIGRACIÓN DUELOS SP] Stored Procedures de Duelo compilados exitosamente en AniDimensionDB.');
    } catch (err) {
        console.error('❌ [ERROR MIGRACIÓN DUELOS SP]', err);
        throw err;
    }
}

if (require.main === module) {
    migrateDuelValidationStoredProcedures().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrateDuelValidationStoredProcedures };
