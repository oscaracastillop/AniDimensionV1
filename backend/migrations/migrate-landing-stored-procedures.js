/**
 * Migración: Stored Procedures Oficiales para la Landing Page
 * Stored Procedure: dbo.sp_ObtenerDatosLandingPage
 * Devuelve métricas reales de BD (cartas, NPCs, duelos, usuarios), ranking oficial y jefes de aventura.
 */
const { getPool } = require('../config/db');

async function migrateLandingStoredProcedures() {
    try {
        console.log('[MIGRATION] Creando/Actualizando Stored Procedure dbo.sp_ObtenerDatosLandingPage...');
        const pool = await getPool();

        const spSql = `
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerDatosLandingPage
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Métricas y KPIs Globales
    SELECT 
        (SELECT COUNT(1) FROM dbo.datas) AS TotalCartas,
        (SELECT COUNT(1) FROM dbo.NPCs) AS TotalNpcs,
        (SELECT COUNT(1) FROM dbo.AdventureEras) AS TotalEras,
        (SELECT COUNT(1) FROM dbo.HistorialDuelos) AS TotalDuelos,
        (SELECT COUNT(1) FROM dbo.Usuarios WHERE IsActive = 1) AS TotalJugadores,
        (SELECT COUNT(1) FROM dbo.Clans WHERE IsActive = 1) AS TotalClanes,
        (SELECT COUNT(1) FROM dbo.BoosterPacks) AS TotalSobres;

    -- 2. Ranking Oficial de Duelistas (Top 10)
    SELECT TOP 10
        u.Id,
        u.Username,
        ISNULL(u.Nivel, 1) AS Nivel,
        ISNULL(u.Experiencia, 0) AS Experiencia,
        ISNULL(u.Starships, 500) AS Starships,
        ISNULL(u.AvatarActivoId, 'AVA-001') AS AvatarActivoId,
        ISNULL(c.Name, 'Mundial') AS CountryName,
        ISNULL(c.FlagEmoji, N'🌐') AS FlagEmoji,
        ISNULL(c.IsoCode, 'GL') AS CountryIsoCode,
        ISNULL((SELECT COUNT(1) FROM dbo.HistorialDuelos hd WHERE hd.UsuarioId = u.Id AND hd.EsVictoria = 1), 0) AS VictoriasReales,
        ISNULL((SELECT COUNT(1) FROM dbo.HistorialDuelos hd WHERE hd.UsuarioId = u.Id), 0) AS DuelosTotales,
        (ISNULL(u.Nivel, 1) * 120 + ISNULL(u.Experiencia, 0) + 
         ISNULL((SELECT COUNT(1) FROM dbo.HistorialDuelos hd WHERE hd.UsuarioId = u.Id AND hd.EsVictoria = 1), 0) * 50) AS EloRating,
        CASE WHEN u.IsOnline = 1 OR u.LastLoginAt >= DATEADD(MINUTE, -30, GETDATE()) THEN 1 ELSE 0 END AS IsOnline
    FROM dbo.Usuarios u
    LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
    WHERE u.IsActive = 1
    ORDER BY (ISNULL(u.Nivel, 1) * 120 + ISNULL(u.Experiencia, 0) + 
              ISNULL((SELECT COUNT(1) FROM dbo.HistorialDuelos hd WHERE hd.UsuarioId = u.Id AND hd.EsVictoria = 1), 0) * 50) DESC,
             u.Nivel DESC, u.Experiencia DESC, u.Id ASC;

    -- 3. Jefes Destacados de Modo Aventura (NPCs oficiales con retratos reales)
    SELECT TOP 12
        n.Id,
        n.Name,
        n.Level,
        n.PortraitCode,
        n.LocationName,
        n.DeckTheme,
        n.IsBoss,
        n.Difficulty,
        e.Title AS EraTitle,
        e.Series AS EraSeries
    FROM dbo.NPCs n
    INNER JOIN dbo.AdventureEras e ON n.EraId = e.Id
    WHERE n.PortraitCode IS NOT NULL 
      AND n.PortraitCode <> ''
      AND (n.IsBoss = 1 OR n.Level IN (4, 15, 20, 24, 40, 80, 96, 125, 140, 185, 225, 272))
    ORDER BY n.Level ASC;

    -- 4. Top Clanes
    SELECT TOP 5
        c.Id,
        c.Name,
        c.Tag,
        c.Level,
        c.Trophies,
        ISNULL(u.Username, 'Líder') AS LeaderName,
        (SELECT COUNT(1) FROM dbo.ClanMembers cm WHERE cm.ClanId = c.Id) AS TotalMiembros
    FROM dbo.Clans c
    LEFT JOIN dbo.Usuarios u ON c.LeaderUserId = u.Id
    WHERE c.IsActive = 1
    ORDER BY c.Trophies DESC, c.Level DESC, c.Id ASC;
END;
        `;

        await pool.request().query(spSql);
        console.log('✅ Stored Procedure dbo.sp_ObtenerDatosLandingPage creado/actualizado con éxito.');

        // Test execution
        const testRes = await pool.request().execute('dbo.sp_ObtenerDatosLandingPage');
        console.log('[TEST SP] KPIs obtenidos:', testRes.recordsets[0][0]);
        console.log('[TEST SP] Ranking Jugadores:', testRes.recordsets[1]);
        console.log('[TEST SP] NPCs Jefes:', testRes.recordsets[2].length);
        console.log('[TEST SP] Clanes:', testRes.recordsets[3].length);

        return true;
    } catch (err) {
        console.error('❌ Error migrando SP de Landing:', err);
        throw err;
    }
}

if (require.main === module) {
    migrateLandingStoredProcedures().then(() => {
        console.log('Migración finalizada.');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { migrateLandingStoredProcedures };
