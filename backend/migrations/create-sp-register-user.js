/**
 * Ani-Dimension: Migración SQL Server
 * Procedimiento Almacenado Oficial: dbo.sp_RegistrarNuevoUsuario
 * Inserta atómicamente Usuario, 5000 Estrellas, Avatar AVA-002, AvatarStats, y Mazo Inicial OCG de 40 cartas.
 */
const { getPool, sql } = require('../config/db');

async function createStoredProcedure() {
    try {
        console.log('[MIGRATION] Conectando a SQL Server para crear dbo.sp_RegistrarNuevoUsuario...');
        const pool = await getPool();

        const spSql = `
        CREATE OR ALTER PROCEDURE dbo.sp_RegistrarNuevoUsuario
            @Username VARCHAR(50),
            @Email VARCHAR(150),
            @PasswordHash VARCHAR(255),
            @CountryIsoCode NVARCHAR(5) = 'CO'
        AS
        BEGIN
            SET NOCOUNT ON;
            BEGIN TRY
                -- 1. Validaciones de unicidad estricta (Username y Email no se deben repetir)
                IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE LOWER(LTRIM(RTRIM(Username))) = LOWER(LTRIM(RTRIM(@Username))))
                BEGIN
                    RAISERROR('El nombre de usuario ya está registrado. Por favor elige otro.', 16, 1);
                    RETURN;
                END

                IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(@Email))))
                BEGIN
                    RAISERROR('El correo electrónico ya está registrado. Por favor elige otro.', 16, 1);
                    RETURN;
                END

                -- Validar país en catálogo
                DECLARE @IsoCode NVARCHAR(5) = ISNULL(@CountryIsoCode, 'CO');
                IF NOT EXISTS (SELECT 1 FROM dbo.Countries WHERE IsoCode = @IsoCode)
                BEGIN
                    SET @IsoCode = 'CO';
                END

                BEGIN TRANSACTION;

                -- 2. Insertar en dbo.Usuarios con 5,000 Starships, nivel 1, avatar AVA-002 por defecto
                DECLARE @NewUserId INT;
                INSERT INTO dbo.Usuarios (
                    Username, 
                    Email, 
                    PasswordHash, 
                    Nivel, 
                    Experiencia, 
                    Starships, 
                    IsAdmin, 
                    IsActive, 
                    FechaCreacion, 
                    FundaActivaId, 
                    MatActivoId, 
                    AvatarActivoId, 
                    CountryIsoCode
                )
                VALUES (
                    LTRIM(RTRIM(@Username)), 
                    LOWER(LTRIM(RTRIM(@Email))), 
                    @PasswordHash, 
                    1, 
                    0, 
                    5000, 
                    0, 
                    1, 
                    GETDATE(), 
                    NULL, 
                    NULL, 
                    'AVA-002', 
                    @IsoCode
                );

                SET @NewUserId = SCOPE_IDENTITY();

                -- 3. Crear registro en dbo.AvatarStats con bonificaciones base
                IF NOT EXISTS (SELECT 1 FROM dbo.AvatarStats WHERE UsuarioId = @NewUserId)
                BEGIN
                    INSERT INTO dbo.AvatarStats (UsuarioId, BonusExp, BonusStarships, BonusSuerte)
                    VALUES (@NewUserId, 0.0, 0.0, 0.0);
                END

                -- 4. Registrar avatar inicial AVA-002 en dbo.UserAvatars si existe la tabla
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UserAvatars')
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserAvatars WHERE UserId = @NewUserId AND AvatarCode = 'AVA-002')
                    BEGIN
                        INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
                        VALUES (@NewUserId, 'AVA-002', 0.0, 0.0, 0.0, 1);
                    END
                END

                -- 5. Crear Mazo Inicial Reglamentario (Starter Deck de 40 cartas OCG) en dbo.Decks
                DECLARE @StarterDeckJson NVARCHAR(MAX) = N'[32274490,32274490,32274490,76103675,80813021,53293545,89091579,36121917,36121917,90357090,76184692,32452818,9159938,1784619,57305373,75356564,75356564,75356564,20060230,44287299,85705804,85705804,85705804,72842870,53375573,2863439,17535588,85639257,33064647,96851799,56283725,80770678,43500484,16353197,76211194,73134081,46130346,63102017,51482758,50045299]';

                IF NOT EXISTS (SELECT 1 FROM dbo.Decks WHERE UsuarioId = @NewUserId)
                BEGIN
                    INSERT INTO dbo.Decks (
                        UsuarioId, 
                        Nombre, 
                        MainDeckJson, 
                        ExtraDeckJson, 
                        SideDeckJson, 
                        EsActivo, 
                        FechaCreacion
                    )
                    VALUES (
                        @NewUserId, 
                        'Mazo Inicial OCG', 
                        @StarterDeckJson, 
                        '[]', 
                        '[]', 
                        1, 
                        GETDATE()
                    );
                END

                COMMIT TRANSACTION;

                -- 6. Retornar el usuario recién creado con sus datos completos y país
                SELECT 
                    u.Id, 
                    u.Username, 
                    u.Email, 
                    u.Nivel, 
                    u.Experiencia, 
                    u.Starships, 
                    u.IsAdmin, 
                    u.FundaActivaId, 
                    u.MatActivoId, 
                    u.AvatarActivoId, 
                    u.CountryIsoCode,
                    c.Name AS CountryName,
                    c.FlagEmoji,
                    c.FlagSvgUrl,
                    d.MainDeckJson,
                    d.ExtraDeckJson
                FROM dbo.Usuarios u
                LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
                LEFT JOIN dbo.Decks d ON u.Id = d.UsuarioId AND d.EsActivo = 1
                WHERE u.Id = @NewUserId;

            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;

                DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
                RAISERROR(@ErrorMessage, 16, 1);
            END CATCH
        END;
        `;

        await pool.request().query(spSql);
        console.log('✅ [SQL SUCCESS] Procedimiento almacenado dbo.sp_RegistrarNuevoUsuario creado/actualizado exitosamente.');
        process.exit(0);
    } catch (err) {
        console.error('❌ [SQL ERROR] No se pudo crear el procedimiento almacenado:', err);
        process.exit(1);
    }
}

createStoredProcedure();
