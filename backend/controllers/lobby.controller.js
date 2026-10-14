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

        let clanRankings = [];
        try {
            const pool = await getPool();
            const clansRes = await pool.request().query(`
                SELECT TOP 10 
                    c.Id, c.Name, c.Tag, c.EmblemUrl, c.Level, c.Exp, c.Trophies,
                    ISNULL(u.Username, 'Líder') as Leader,
                    (SELECT COUNT(1) FROM dbo.ClanMembers cm WHERE cm.ClanId = c.Id) as Members,
                    c.MaxMembers
                FROM dbo.Clans c
                LEFT JOIN dbo.Usuarios u ON c.LeaderUserId = u.Id
                WHERE c.IsActive = 1
                ORDER BY c.Level DESC, c.Exp DESC, c.Id ASC
            `);
            clanRankings = clansRes.recordset.map((c, idx) => ({
                Rank: idx + 1,
                Name: c.Name,
                Tag: c.Tag,
                Leader: c.Leader,
                Members: c.Members || 1,
                MaxMembers: c.MaxMembers || 30,
                Level: c.Level || 1,
                Trophies: c.Trophies || 0,
                Shield: "🛡️"
            }));
        } catch (cErr) {
            console.warn('[LOBBY CLAN DB WARNING]', cErr.message);
        }

        const activeEvents = [
            {
                id: "EVT_TORNEOS_OCG",
                title: "⚔️ Torneos Oficiales OCG (Próximamente)",
                badge: "PRÓXIMAMENTE",
                badgeColor: "#ffd700",
                description: "Gran sistema oficial de torneos competitivos con emparejamiento automático por llaves (brackets), salas de espectadores en vivo y clasificaciones mundiales.",
                reward: "Próximamente",
                endDate: "Próximamente",
                icon: "🏆"
            },
            {
                id: "EVT_PUZZLE_MILLENNIUM",
                title: "🧩 Evento del Rompecabezas Milenario",
                badge: "ACTIVO",
                badgeColor: "#00f0ff",
                description: "Consigue las piezas místicas del Rompecabezas en victorias de duelos PvP y NPCs. Completa el artefacto legendario para forjar el poder definitivo.",
                reward: "Colección Mística",
                endDate: "Permanente",
                icon: "🧩"
            },
            {
                id: "EVT_ADVENTURE_CAMPAIGN",
                title: "🗺️ Modo Aventura: Campaña Legendaria de 12 Eras",
                badge: "DISPONIBLE",
                badgeColor: "#10b981",
                description: "Enfréntate a más de 200 duelistas legendarios en 12 Eras maestras de Yu-Gi-Oh! Desbloquea Medallas de honor con bonificaciones automáticas y permanentes de EXP, Starships y Suerte.",
                reward: "Medallas & Bonificadores",
                endDate: "Permanente",
                icon: "🗺️"
            },
            {
                id: "EVT_COSMETICS_SHOWCASE",
                title: "🎴 Sistema de Cosméticos & Personalización",
                badge: "DISPONIBLE",
                badgeColor: "#c084fc",
                description: "Equipa Tapetes de Duelo para personalizar tu mitad del campo y Fundas místicas para el reverso de tus cartas en combate.",
                reward: "Tapetes & Fundas",
                endDate: "Permanente",
                icon: "🎴"
            },
            {
                id: "EVT_PVP_ARENA",
                title: "🌐 Arena de Duelos PvP en Tiempo Real",
                badge: "DISPONIBLE",
                badgeColor: "#38bdf8",
                description: "Salas multijugador públicas y privadas con límite de 2 minutos por turno, temporizador sincronizado y clasificación oficial.",
                reward: "Ranking & Puntos de Liga",
                endDate: "Permanente",
                icon: "⚔️"
            }
        ];

        const updatesList = [
            {
                version: "v1.6.0",
                date: "10 Octubre 2026",
                title: "Cosméticos de Duelo, Buzón de Recompensas & Banda Sonora",
                highlights: [
                    "Personalización de combate con Tapetes de Duelo para tu campo y Fundas exclusivas para el reverso de tus cartas.",
                    "Buzón Satelital & Baúl de Recompensas: recibe premios de administración y aplica potenciadores directamente a tu Avatar activo.",
                    "Banda sonora inmersiva con música de fondo en bucle dedicada por módulo y temas de batalla dinámicos por Era.",
                    "Optimización de interfaz de alta resolución adaptada para dispositivos móviles y tablets."
                ]
            },
            {
                version: "v1.5.0",
                date: "08 Octubre 2026",
                title: "Gran Expansión Modo Aventura: 12 Eras Legendarias & 200+ Duelistas",
                highlights: [
                    "Campaña expandida a 12 Eras históricas de Yu-Gi-Oh! (Duel Monsters, Reino, Batallas, Dartz, Egipto, GX, 5D's y Jefes Finales).",
                    "Colección de Medallas de honor con bonificaciones permanentes de EXP, Starships y Suerte que se activan de forma automática.",
                    "Inteligencia de combate avanzada en cada adversario con barajas y estrategias representativas de su época.",
                    "Duelos de clímax épicos con música orquestal reactiva según la diferencia de Life Points."
                ]
            },
            {
                version: "v1.4.0",
                date: "05 Octubre 2026",
                title: "Tienda Dimensional, Sobres por Eras & Sistema de Clanes",
                highlights: [
                    "Catálogo completo de sobres de cartas organizados por Eras oficiales (DM, GX, 5D's y Ediciones Especiales).",
                    "Mercado de cartas individuales, potenciadores de avatar, avatares libres y membresías VIP.",
                    "Creación y gestión de Clanes oficiales con rangos, donaciones de Starships y bonificaciones grupales."
                ]
            },
            {
                version: "v1.3.0",
                date: "04 Octubre 2026",
                title: "Arena de Duelos Multijugador & Temporizador de Turno",
                highlights: [
                    "Salas de duelo públicas y privadas para retar a duelistas de todo el mundo en tiempo real.",
                    "Temporizador reglamentario de 120 segundos por turno para duelos dinámicos y competitivos.",
                    "Sistema de reconexión rápida para regresar al duelo en caso de pérdida momentánea de señal.",
                    "Chat en vivo con dinámicas interactivas de comunidad."
                ]
            },
            {
                version: "v1.2.0",
                date: "02 Octubre 2026",
                title: "Evento del Rompecabezas Milenario & Gran Colección de Cartas",
                highlights: [
                    "Evento Místico del Rompecabezas: reúne piezas exclusivas al ganar combates y completa el artefacto legendario.",
                    "Tablero interactivo de colección con guardado automático de piezas descubiertas.",
                    "Catálogo masivo con miles de cartas clásicas y legendarias listas para el combate.",
                    "Tienda de sobres por temporadas con lanzamientos programados de expansiones."
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
