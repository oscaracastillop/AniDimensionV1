const { getPool } = require('../backend/config/db');

async function updateSpPerfilClan() {
    const pool = await getPool();

    console.log('Actualizando dbo.sp_ObtenerDetallePerfilUsuario con información del Clan...');

    const spSql = `
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerDetallePerfilUsuario
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
`;

    await pool.request().query(spSql);
    console.log('✅ dbo.sp_ObtenerDetallePerfilUsuario actualizado exitosamente.');

    console.log('Creando alias dbo.sp_ObtenerPerfilUsuario...');
    const aliasSql = `
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerPerfilUsuario
    @UserId INT = NULL,
    @Username NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ObtenerDetallePerfilUsuario @UserId = @UserId, @Username = @Username;
END;
`;
    await pool.request().query(aliasSql);
    console.log('✅ dbo.sp_ObtenerPerfilUsuario creado exitosamente.');

    // Probar ejecución para usuario Admin (ID 1)
    const testRes = await pool.request()
        .input('UserId', 1)
        .execute('dbo.sp_ObtenerDetallePerfilUsuario');

    console.log('Test resultado para UserId 1:');
    if (testRes.recordset && testRes.recordset[0]) {
        const u = testRes.recordset[0];
        console.log(`Usuario: ${u.Username}, Clan: ${u.ClanNombre}, Tag: ${u.ClanTag}, Rol: ${u.ClanRol}`);
    }

    await pool.close();
}

updateSpPerfilClan().catch(console.error);
