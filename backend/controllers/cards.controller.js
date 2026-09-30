const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');
const { ocgCardReader, cardDbCache } = require('../data/sql-card-reader');
const { fetchCardData } = require('../data/cards.data');
const { duelRooms } = require('../engine/duel-state');

// Caché de cartas LOB con datos completos de la base de datos
let lobCardsCache = null;
function getLobCards() {
    if (!lobCardsCache) {
        const lobPath = path.resolve(__dirname, '../data/lob_cards_db.json');
        if (fs.existsSync(lobPath)) {
            try {
                lobCardsCache = JSON.parse(fs.readFileSync(lobPath, 'utf-8'));
            } catch (e) {
                console.error('Error al leer lob_cards_db.json:', e);
                lobCardsCache = [];
            }
        } else {
            lobCardsCache = [];
        }
    }
    return lobCardsCache;
}

/**
 * Health check endpoint
 */
function health(req, res) {
    return res.json({
        status: 'online',
        game: 'Ani-Dimension Modular OCG',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
}

/**
 * Consulta de carta por ID (Lector Oficial SQL Server datas + texts)
 */
async function getCardById(req, res) {
    try {
        const cardId = req.params.id;
        // Consulta desde SQL Server / Cache oficial de cards.cdb
        const card = ocgCardReader(cardId);
        if (card) {
            return res.json({ success: true, card });
        }
        const fallback = await fetchCardData(cardId);
        return res.json({ success: true, card: fallback });
    } catch (err) {
        console.error('[API CARDS ERROR]', err);
        return res.status(500).json({ success: false, error: 'Error al consultar carta' });
    }
}

/**
 * Catálogo de paquetes/sobres oficiales con cartas LOB de la base de datos
 */
function getPacks(req, res) {
    const lobCards = getLobCards();
    const packs = [
        {
            id: 'LOB',
            name: 'Legend of Blue Eyes White Dragon',
            code: 'LOB',
            active: true,
            price: 1500,
            offer_text: '15% DESC',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'La primera expansión legendaria de Yu-Gi-Oh! Contiene el Dragón Blanco de Ojos Azules, Mago Oscuro, las 5 piezas de Exodia, Raigeki, Monstruo Renacido y más.',
            cards_per_pack: 4,
            cards: lobCards
        },
        {
            id: 'MRD',
            name: 'Metal Raiders',
            code: 'MRD',
            active: false,
            price: 1500,
            offer_text: 'NUEVA EXPANSIÓN',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Segunda expansión oficial OCG. Introduce potentes cartas de trampa y monstruos emblemáticos como el Dragón de Cañón.',
            cards_per_pack: 4,
            cards: []
        },
        {
            id: 'MRL',
            name: 'Spell Ruler',
            code: 'MRL',
            active: false,
            price: 1500,
            offer_text: 'EDICIÓN RITUAL',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Tercera expansión OCG enfocada en magias rápidas y monstruos de ritual. Expande las tácticas avanzadas de tu Deck.',
            cards_per_pack: 4,
            cards: []
        },
        {
            id: 'PSV',
            name: "Pharaoh's Servant",
            code: 'PSV',
            active: false,
            price: 1500,
            offer_text: 'SECRETO FARAÓN',
            image: '../../assets/images/packs/lob_pack.jpg',
            description: 'Cuarta expansión OCG legendaria del Faraón. Introduce estrategias de trampas continuas y cartas secretas OCG.',
            cards_per_pack: 4,
            cards: []
        }
    ];

    return res.json({ success: true, packs });
}

/**
 * Consulta de sobre específico por ID
 */
function getPackById(req, res) {
    const packId = (req.params.packId || '').toUpperCase();
    if (packId === 'LOB') {
        const lobCards = getLobCards();
        return res.json({
            success: true,
            pack: {
                id: 'LOB',
                name: 'Legend of Blue Eyes White Dragon',
                code: 'LOB',
                active: true,
                price: 1500,
                offer_text: '15% DESC',
                image: '../../assets/images/packs/lob_pack.jpg',
                description: 'La primera expansión legendaria de Yu-Gi-Oh! Contiene el Dragón Blanco de Ojos Azules, Mago Oscuro, las 5 piezas de Exodia, Raigeki, Monstruo Renacido y más.',
                cards_per_pack: 4,
                cards: lobCards
            }
        });
    }
    return res.status(404).json({ success: false, error: 'Sobre no encontrado' });
}

/**
 * Consulta por lote de cartas
 */
function getBatchCards(req, res) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
        return res.status(400).json({ success: false, error: 'Parámetro ids debe ser un array' });
    }
    const cards = ids.map(id => ocgCardReader(id)).filter(Boolean);
    return res.json({ success: true, cards });
}

/**
 * Búsqueda de cartas en la base de datos OCG
 */
function searchCards(req, res) {
    const q = (req.query.q || '').trim().toLowerCase();
    const type = (req.query.type || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const results = [];
    for (const card of cardDbCache.values()) {
        if (q && !card.name.toLowerCase().includes(q) && !String(card.id).includes(q)) {
            continue;
        }
        if (type && !card.type.toLowerCase().includes(type)) {
            continue;
        }
        results.push(card);
        if (results.length >= limit) break;
    }
    return res.json({ success: true, total: results.length, cards: results });
}

/**
 * Catálogo oficial de Países con Banderas desde dbo.Countries
 */
async function getCountries(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT IsoCode, Name, FlagEmoji, FlagSvgUrl, PhonePrefix
            FROM dbo.Countries
            ORDER BY Name ASC
        `);
        return res.json({ success: true, countries: result.recordset });
    } catch (err) {
        console.error('[API /api/countries ERROR]', err.message);
        return res.status(500).json({ success: false, message: 'Error al consultar catálogo de países.', error: err.message });
    }
}

/**
 * Consulta de Cementerio (GY) y Destierro para una sala activa
 */
function getGraveyard(req, res) {
    const { roomId, player } = req.params;
    const duelState = duelRooms.get(roomId);

    if (!duelState) {
        return res.status(404).json({ error: 'Sala de duelo no encontrada.' });
    }

    const targetKey = player === 'player2' ? 'player2' : 'player1';
    const playerData = duelState[targetKey];

    if (!playerData) {
        return res.status(404).json({ error: 'Jugador no encontrado en el duelo.' });
    }

    return res.json({
        player: targetKey,
        graveyard: playerData.graveyard || [],
        banished: playerData.banished || [],
        extraDeck: playerData.extraDeck || []
    });
}

module.exports = {
    health,
    getCardById,
    getPacks,
    getPackById,
    getBatchCards,
    searchCards,
    getCountries,
    getGraveyard
};
