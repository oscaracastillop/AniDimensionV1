const { getPool, sql } = require('../config/db');

/**
 * Obtener contenido dinámico del Lobby (Noticias, Eventos, Rankings de Jugadores y Clanes)
 */
async function getLobbyContent(req, res) {
    try {
        let playerRankings = [];
        try {
            const pool = await getPool();
            const usersRes = await pool.request().query(`
                SELECT TOP 10 
                    u.Id, u.Username, u.CountryIsoCode,
                    ISNULL(c.Name, 'Desconocido') as CountryName,
                    ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                    ISNULL(u.Nivel, 1) as Nivel,
                    ISNULL(u.Experiencia, 0) as Experiencia,
                    ISNULL(u.Starships, 500) as Starships,
                    (ISNULL(u.Nivel, 1) * 120 + ISNULL(u.Experiencia, 0)) as EloRating,
                    (ISNULL(u.Nivel, 1) * 3 + 5) as Wins
                FROM dbo.Usuarios u
                LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
                ORDER BY EloRating DESC, u.Id ASC
            `);
            playerRankings = usersRes.recordset;
        } catch (dbErr) {
            console.warn('[LOBBY DB WARNING] Usando ranking precargado de respaldo:', dbErr.message);
        }

        if (!playerRankings || playerRankings.length === 0) {
            playerRankings = [
                { Rank: 1, Username: "SetoKaiba", FlagEmoji: "🇯🇵", CountryName: "Japón", Nivel: 99, EloRating: 2850, Wins: 342 },
                { Rank: 2, Username: "YugiMuto", FlagEmoji: "🇯🇵", CountryName: "Japón", Nivel: 95, EloRating: 2790, Wins: 310 },
                { Rank: 3, Username: "Admin", FlagEmoji: "🇨🇴", CountryName: "Colombia", Nivel: 88, EloRating: 2540, Wins: 215 },
                { Rank: 4, Username: "JoeyWheeler", FlagEmoji: "🇺🇸", CountryName: "Estados Unidos", Nivel: 82, EloRating: 2380, Wins: 198 },
                { Rank: 5, Username: "MaiValentine", FlagEmoji: "🇺🇸", CountryName: "Estados Unidos", Nivel: 78, EloRating: 2210, Wins: 175 },
                { Rank: 6, Username: "MarikIshtar", FlagEmoji: "🇪🇬", CountryName: "Egipto", Nivel: 75, EloRating: 2150, Wins: 160 },
                { Rank: 7, Username: "BakuraRyo", FlagEmoji: "🇬🇧", CountryName: "Reino Unido", Nivel: 70, EloRating: 1990, Wins: 145 },
                { Rank: 8, Username: "PegasusJ", FlagEmoji: "🇺🇸", CountryName: "Estados Unidos", Nivel: 68, EloRating: 1920, Wins: 130 }
            ];
        } else {
            playerRankings = playerRankings.map((p, idx) => ({
                Rank: idx + 1,
                Username: p.username || p.Username,
                FlagEmoji: p.FlagEmoji || '🌐',
                CountryName: p.CountryName || 'Mundial',
                Nivel: p.Nivel || 1,
                EloRating: p.EloRating || 1000,
                Wins: p.Wins || 0
            }));
        }

        const clanRankings = [
            { Rank: 1, Name: "Ani Dimension Elite", Tag: "AD", Leader: "DuelMaster", Members: 48, MaxMembers: 50, Trophies: 12500, Shield: "⚡" },
            { Rank: 2, Name: "Ilusionistas Milenio", Tag: "EYE", Leader: "PegasusJ", Members: 45, MaxMembers: 50, Trophies: 11200, Shield: "👁️" },
            { Rank: 3, Name: "Fuerza del Dragón", Tag: "DRG", Leader: "Admin", Members: 42, MaxMembers: 50, Trophies: 9800, Shield: "🐉" },
            { Rank: 4, Name: "Magos del Tiempo", Tag: "WIZ", Leader: "JoeyWheeler", Members: 38, MaxMembers: 50, Trophies: 8650, Shield: "⌛" },
            { Rank: 5, Name: "Héroes del Destino", Tag: "D-H", Leader: "AsterP", Members: 35, MaxMembers: 50, Trophies: 7900, Shield: "⚔️" },
            { Rank: 6, Name: "Sombras Oscuras", Tag: "SHD", Leader: "MarikIshtar", Members: 30, MaxMembers: 50, Trophies: 6800, Shield: "🌑" }
        ];

        const activeEvents = [
            {
                id: "EVT_AD_CUP",
                title: "🏆 Gran Copa Ani Dimension 2026",
                badge: "TORNEO ESPECIAL",
                badgeColor: "#ffd700",
                description: "Compite en duelos reglamentarios OCG contra duelistas y NPCs élite para ganar gemas Starships, fundas y títulos exclusivos.",
                reward: "⭐ 2,500 Starships + Funda Dragón Blanco",
                endDate: "30 Septiembre 2026",
                icon: "🏆"
            },
            {
                id: "EVT_NPC_CHALLENGE",
                title: "⚔️ Duelo de Maestros: NPC Yugi Muto",
                badge: "DESTACADO",
                badgeColor: "#00f0ff",
                description: "Pon a prueba tu mazo reglamentario de 40 cartas contra el mazo oficial de Yugi Muto con reglas estrictas de tirada de dados y turno 1 sin ataque.",
                reward: "⭐ 500 Starships por victoria",
                endDate: "Permanente",
                icon: "🔮"
            }
        ];

        const updatesList = [
            {
                version: "v2.0.0",
                date: "24 Septiembre 2026",
                title: "Arquitectura Modular, Separación de Vistas y Soporte APK Móvil",
                highlights: [
                    "Arquitectura modularizada y lista para compilación APK nativa (Android) y Web.",
                    "Desacoplamiento total: Vistas, Estilos CSS y Controladores JS dedicados.",
                    "Motor OCG optimizado con resolución de cadenas LIFO y hand-traps.",
                    "Flujo de tirada de dados 3D y selección de primer turno.",
                    "Tablero reglamentario Konami Master Duel con Zonas EMZ integradas."
                ]
            },
            {
                version: "v1.4.0",
                date: "23 Septiembre 2026",
                title: "Reglas Oficiales Konami, Tirada de Dados & Campo Limpio",
                highlights: [
                    "Mecánica pre-duelo de tirada de dados: el ganador del dado mayor elige el orden de inicio.",
                    "Campo reglamentario limpio: inicio con 0 cartas en campo y 5 cartas en mano.",
                    "Regla OCG oficial Turno 1: el primer jugador no puede entrar a Battle Phase ni atacar.",
                    "Ajuste de nick de usuario: máximo 15 caracteres y estricto a 1 sola palabra sin espacios.",
                    "Lobby de bienvenida con ranking de jugadores, clanes y menú central de duelos."
                ]
            }
        ];

        return res.json({
            success: true,
            events: activeEvents,
            updates: updatesList,
            playerRankings: playerRankings,
            clanRankings: clanRankings
        });
    } catch (err) {
        console.error('[API /api/lobby/content ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al obtener contenido del lobby' });
    }
}

module.exports = {
    getLobbyContent
};
