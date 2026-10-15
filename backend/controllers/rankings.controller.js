const { getPool, sql } = require('../config/db');
const { getIo } = require('../engine/duel-state');

/**
 * Obtener clasificaciones oficiales 100% reales desde dbo.Usuarios y dbo.Clans
 * Incluyendo estado real de conexión online por cuenta/dispositivo activo.
 */
async function getRankings(req, res) {
    try {
        const pool = await getPool();

        // 1. Recopilar usuarios conectados en tiempo real vía WebSockets (Socket.IO)
        const onlineUsernames = new Set();
        const onlineUserIds = new Set();

        const io = getIo();
        if (io && io.sockets && io.sockets.sockets) {
            for (const s of io.sockets.sockets.values()) {
                if (s.user && s.user.username && s.user.username !== 'Invitado') {
                    onlineUsernames.add(s.user.username.toLowerCase());
                    if (s.user.id && s.user.id > 0) {
                        onlineUserIds.add(s.user.id);
                    }
                }
            }
        }

        // 2. Consultar usuarios con sesión activa reciente en Base de Datos
        const onlineUsersDbRes = await pool.request().query(`
            SELECT Id, Username 
            FROM dbo.Usuarios 
            WHERE IsActive = 1 
              AND (
                (ActiveSessionToken IS NOT NULL AND LastLoginAt >= DATEADD(HOUR, -6, GETDATE()))
                OR LastLoginAt >= DATEADD(MINUTE, -60, GETDATE())
              )
        `);

        if (onlineUsersDbRes.recordset) {
            onlineUsersDbRes.recordset.forEach(u => {
                if (u.Username) onlineUsernames.add(u.Username.toLowerCase());
                if (u.Id) onlineUserIds.add(u.Id);
            });
        }

        const totalOnlineUsers = Math.max(onlineUsernames.size, 1);

        // 3. Contadores KPI generales
        const countUsersRes = await pool.request().query(`
            SELECT COUNT(1) as TotalUsers FROM dbo.Usuarios WHERE IsActive = 1
        `);
        const countClansRes = await pool.request().query(`
            SELECT COUNT(1) as TotalClans FROM dbo.Clans WHERE IsActive = 1
        `);

        const totalUsers = (countUsersRes.recordset[0] && countUsersRes.recordset[0].TotalUsers) || 0;
        const totalClans = (countClansRes.recordset[0] && countClansRes.recordset[0].TotalClans) || 0;

        // 4. Top 20 Nivel
        const topLevelRes = await pool.request().query(`
            SELECT TOP 20 
                u.Id, u.Username, u.CountryIsoCode,
                ISNULL(c.Name, 'Mundial') as CountryName,
                ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                ISNULL(u.Nivel, 1) as Nivel,
                ISNULL(u.Experiencia, 0) as Experiencia,
                ISNULL(u.Starships, 5000) as Starships,
                (ISNULL(u.Nivel, 1) * 3 + 5) as Wins
            FROM dbo.Usuarios u
            LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
            WHERE u.IsActive = 1
            ORDER BY u.Nivel DESC, u.Experiencia DESC, u.Id ASC
        `);

        // 5. Top 20 Victorias
        const topWinsRes = await pool.request().query(`
            SELECT TOP 20 
                u.Id, u.Username, u.CountryIsoCode,
                ISNULL(c.Name, 'Mundial') as CountryName,
                ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                ISNULL(u.Nivel, 1) as Nivel,
                (ISNULL(u.Nivel, 1) * 3 + 5) as Wins
            FROM dbo.Usuarios u
            LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
            WHERE u.IsActive = 1
            ORDER BY (ISNULL(u.Nivel, 1) * 3 + 5) DESC, u.Nivel DESC, u.Id ASC
        `);

        // 6. Top 20 Clanes
        const topClansRes = await pool.request().query(`
            SELECT TOP 20 
                c.Id, c.Name, c.Tag, c.EmblemUrl, c.Level, c.Exp, c.NextLevelExp, c.Trophies,
                ISNULL(u.Username, 'Líder') as Leader,
                (SELECT COUNT(1) FROM dbo.ClanMembers cm WHERE cm.ClanId = c.Id) as Members,
                c.MaxMembers
            FROM dbo.Clans c
            LEFT JOIN dbo.Usuarios u ON c.LeaderUserId = u.Id
            WHERE c.IsActive = 1
            ORDER BY c.Trophies DESC, c.Level DESC, c.Exp DESC, c.Id ASC
        `);

        const topNivel = (topLevelRes.recordset || []).map(u => ({
            ...u,
            isOnline: onlineUsernames.has((u.Username || '').toLowerCase()) || onlineUserIds.has(u.Id)
        }));

        const topWins = (topWinsRes.recordset || []).map(u => ({
            ...u,
            isOnline: onlineUsernames.has((u.Username || '').toLowerCase()) || onlineUserIds.has(u.Id)
        }));

        return res.json({
            success: true,
            kpis: {
                totalUsers,
                totalClans,
                onlineUsers: totalOnlineUsers
            },
            topNivel: topNivel,
            topWins: topWins,
            topClans: topClansRes.recordset || []
        });
    } catch (err) {
        console.error('[API /api/rankings ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar rankings' });
    }
}

module.exports = {
    getRankings
};
