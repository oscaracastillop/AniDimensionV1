const { getPool, sql } = require('../config/db');

async function main() {
    try {
        const pool = await getPool();

        // 1. Actualizar sp_AutenticarUsuario para marcar IsOnline = 1
        console.log('Actualizando dbo.sp_AutenticarUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_AutenticarUsuario
                @Username VARCHAR(50),
                @NewSessionToken NVARCHAR(100),
                @ForceLogin BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @UserId INT, @IsActive BIT, @IsBanned BIT, @CurrentToken NVARCHAR(100), @LastLogin DATETIME;
                DECLARE @Nivel INT, @Exp BIGINT, @Starships BIGINT, @IsAdmin BIT, @Email VARCHAR(150);
                DECLARE @AvatarActivoId VARCHAR(50), @FundaActivaId VARCHAR(50), @MatActivoId VARCHAR(50);
                DECLARE @CountryIsoCode NVARCHAR(5);

                SELECT 
                    @UserId = Id,
                    @IsActive = IsActive,
                    @IsBanned = IsBanned,
                    @CurrentToken = ActiveSessionToken,
                    @LastLogin = LastLoginAt,
                    @Nivel = Nivel,
                    @Exp = Experiencia,
                    @Starships = Starships,
                    @IsAdmin = IsAdmin,
                    @Email = Email,
                    @AvatarActivoId = AvatarActivoId,
                    @FundaActivaId = FundaActivaId,
                    @MatActivoId = MatActivoId,
                    @CountryIsoCode = CountryIsoCode
                FROM dbo.Usuarios
                WHERE LOWER(Username) = LOWER(@Username);

                IF @UserId IS NULL
                BEGIN
                    SELECT 0 AS Success, 0 AS SessionConflict, 'Usuario no encontrado.' AS Message;
                    RETURN;
                END

                IF @IsActive = 0
                BEGIN
                    SELECT 0 AS Success, 0 AS SessionConflict, 'La cuenta se encuentra desactivada.' AS Message;
                    RETURN;
                END

                IF @IsBanned = 1
                BEGIN
                    SELECT 0 AS Success, 0 AS SessionConflict, 'La cuenta ha sido suspendida por infracción.' AS Message;
                    RETURN;
                END

                -- Actualizar sesión activa y marcar en línea
                UPDATE dbo.Usuarios
                SET ActiveSessionToken = @NewSessionToken,
                    LastLoginAt = GETDATE(),
                    IsOnline = 1
                WHERE Id = @UserId;

                SELECT 
                    1 AS Success,
                    0 AS SessionConflict,
                    'Autenticación exitosa.' AS Message,
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Nivel,
                    u.Experiencia,
                    u.Starships,
                    u.IsAdmin,
                    u.AvatarActivoId,
                    u.FundaActivaId,
                    u.MatActivoId,
                    u.CountryIsoCode,
                    c.Name AS CountryName,
                    c.FlagEmoji,
                    c.FlagSvgUrl
                FROM dbo.Usuarios u
                LEFT JOIN dbo.Countries c ON c.IsoCode = u.CountryIsoCode
                WHERE u.Id = @UserId;
            END;
        `);
        console.log('✅ dbo.sp_AutenticarUsuario actualizado.');

        // 2. Procedimiento para desconectar / cerrar sesión
        console.log('Creando dbo.sp_DesconectarUsuario...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_DesconectarUsuario
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
        `);
        console.log('✅ dbo.sp_DesconectarUsuario creado.');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
