const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');
const { ocgCardReader, cardDbCache, formatOcgCard } = require('../data/sql-card-reader');
const { fetchCardData } = require('../data/cards.data');
const { duelRooms } = require('../engine/duel-state');



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
 * Consulta de carta por ID estandarizada con Stored Procedure sp_GetCardInfo
 */
async function getCardById(req, res) {
    try {
        const rawId = req.params.id;
        const cardId = parseInt(rawId, 10);
        if (!cardId) {
            return res.status(400).json({ success: false, error: 'ID de carta inválido' });
        }

        // 1. Ejecutar procedimiento almacenado oficial sp_GetCardInfo
        try {
            const pool = await getPool();
            if (pool) {
                const spRes = await pool.request()
                    .input('CardId', sql.Int, cardId)
                    .execute('sp_GetCardInfo');

                if (spRes.recordset && spRes.recordset.length > 0) {
                    const row = spRes.recordset[0];
                    const card = typeof formatOcgCard === 'function' ? formatOcgCard(row) : row;
                    return res.json({ success: true, card });
                }
            }
        } catch (dbErr) {
            console.warn('[DB SP ERROR sp_GetCardInfo]', dbErr.message);
        }

        // 2. Fallback a caché en memoria / cards.cdb
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

const { getRawCardsForPack } = require('../services/packs-catalog.service');

/**
 * Catálogo de paquetes/sobres oficiales con datos en tiempo real desde SQL Server (sp_ObtenerCatalogoSobresYCartas)
 * 100% Nativo en SQL Server (Cero lectura de archivos JSON/JS)
 */
async function getPacks(req, res) {
    try {
        const pool = await getPool();
        const spRes = await pool.request().execute('dbo.sp_ObtenerCatalogoSobresYCartas');
        const dbPacks = spRes.recordsets[0] || [];
        const dbCards = spRes.recordsets[1] || [];

        // Agrupar cartas por PackId
        const cardsByPack = new Map();
        for (const c of dbCards) {
            const pId = (c.PackId || '').toUpperCase();
            if (!cardsByPack.has(pId)) cardsByPack.set(pId, []);
            cardsByPack.get(pId).push({
                card_id: c.CardId,
                id: c.CardId,
                name: c.CardName,
                name_es: c.CardNameEs || c.CardName,
                set: c.CardNumber,
                card_number: c.CardNumber,
                type: c.CardType,
                atk: c.Atk,
                def: c.Def,
                level: c.Level,
                attribute: c.Attribute,
                race: c.Race,
                desc: c.Description,
                desc_es: c.DescriptionEs || c.Description,
                description: c.Description,
                description_es: c.DescriptionEs || c.Description,
                rarity: c.Rarity,
                active: Boolean(c.IsActive),
                pack_drop: Boolean(c.PackDrop),
                deck_usable: Boolean(c.DeckUsable),
                npc_drop: Boolean(c.NpcDrop),
                image: c.ImageUrl,
                image_large: c.ImageLargeUrl
            });
        }

        const packs = dbPacks.map(p => {
            const packCards = cardsByPack.get(p.PackId.toUpperCase()) || [];
            return {
                id: p.PackId,
                name: p.Name,
                code: p.Code,
                series: p.Series,
                active: Boolean(p.IsActive),
                visible: Boolean(p.IsVisible),
                price: p.Price,
                offer_text: p.OfferText,
                image: p.Image || '../../assets/images/packs/lob_pack.jpg',
                description: p.Description,
                cards_per_pack: p.CardsPerPack || 3,
                cards: packCards
            };
        });

        return res.json({ success: true, packs, overrides: [] });
    } catch (err) {
        console.error('[API GET PACKS DB ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar catálogo de sobres desde base de datos: ' + err.message });
    }
}

/**
 * Consulta de sobre específico por ID desde SQL Server (sp_ObtenerCartasDeSobres)
 */
async function getPackById(req, res) {
    const packId = (req.params.packId || '').toUpperCase();
    try {
        const pool = await getPool();
        const packRes = await pool.request()
            .input('PackId', sql.NVarChar(50), packId)
            .query('SELECT PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible FROM dbo.BoosterPacks WHERE PackId = @PackId');

        if (!packRes.recordset || packRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Sobre no encontrado.' });
        }

        const p = packRes.recordset[0];
        const cardsRes = await pool.request()
            .input('PackId', sql.NVarChar(50), packId)
            .execute('dbo.sp_ObtenerCartasDeSobres');

        const packCards = (cardsRes.recordset || []).map(c => ({
            card_id: c.CardId,
            id: c.CardId,
            name: c.CardName,
            name_es: c.CardNameEs || c.CardName,
            set: c.CardNumber,
            card_number: c.CardNumber,
            type: c.CardType,
            atk: c.Atk,
            def: c.Def,
            level: c.Level,
            attribute: c.Attribute,
            race: c.Race,
            desc: c.Description,
            desc_es: c.DescriptionEs || c.Description,
            description: c.Description,
            description_es: c.DescriptionEs || c.Description,
            rarity: c.Rarity,
            active: Boolean(c.IsActive),
            pack_drop: Boolean(c.PackDrop),
            deck_usable: Boolean(c.DeckUsable),
            npc_drop: Boolean(c.NpcDrop),
            image: c.ImageUrl,
            image_large: c.ImageLargeUrl
        }));

        return res.json({
            success: true,
            pack: {
                id: p.PackId,
                name: p.Name,
                code: p.Code,
                series: p.Series,
                active: Boolean(p.IsActive),
                visible: Boolean(p.IsVisible),
                price: p.Price,
                offer_text: p.OfferText,
                image: p.Image || '../../assets/images/packs/lob_pack.jpg',
                description: p.Description,
                cards_per_pack: p.CardsPerPack || 3,
                cards: packCards
            }
        });
    } catch (err) {
        console.error('[API GET PACK BY ID ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar sobre: ' + err.message });
    }
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
    const q = (req.query.q || req.query.search || req.query.passcode || '').trim().toLowerCase();
    const type = (req.query.type || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    if (!q && !type) {
        // Devolver primeras 30 cartas destacadas
        const sample = Array.from(cardDbCache.values()).slice(0, 30);
        return res.json({ success: true, total: sample.length, cards: sample });
    }

    // 1. Si es búsqueda numérica exacta de passcode (código de carta)
    const exactId = parseInt(q, 10);
    const results = [];

    if (!isNaN(exactId) && exactId > 0) {
        const exactCard = ocgCardReader(exactId);
        if (exactCard) {
            results.push(exactCard);
        }
    }

    // 2. Buscar por coincidencia parcial en nombre y código
    for (const card of cardDbCache.values()) {
        if (results.some(r => r.id === card.id)) continue;

        const idStr = String(card.id || card.card_id || '');
        const nameStr = (card.name || '').toLowerCase();

        if (q && !nameStr.includes(q) && !idStr.includes(q)) {
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

/**
 * Endpoint de prueba asistida para inyectar carta en mano y sincronizar con navegador
 */
async function testInjectCard(req, res) {
    try {
        const { roomId, cardId, playerKey } = req.body;
        const { enrichDuelStateForBroadcast, getIo } = require('../engine/duel-state');
        const { hydrateCardObject } = require('../data/test-decks');

        let duelState = null;
        let actualRoomId = roomId;

        if (actualRoomId && duelRooms.has(actualRoomId)) {
            duelState = duelRooms.get(actualRoomId);
        } else if (duelRooms.size > 0) {
            const firstEntry = Array.from(duelRooms.entries())[0];
            actualRoomId = firstEntry[0];
            duelState = firstEntry[1];
        }

        if (!duelState) {
            return res.status(404).json({ success: false, message: 'No hay sala de duelo activa en memoria' });
        }

        const pKey = playerKey || 'player1';
        const numId = parseInt(cardId, 10);
        const cardObj = hydrateCardObject(numId, pKey);

        // Preparar estado del turno
        duelState[pKey].hand = [cardObj];
        duelState.turnPlayer = duelState[pKey].username;
        duelState.phase = 'MAIN_1';
        duelState.hasNormalSummoned = false;
        duelState.normalSummonUsed = false;

        // Limpiar slots del jugador
        duelState[pKey].monsters = [null, null, null, null, null];
        duelState[pKey].spells = [null, null, null, null, null];

        const level = cardObj.level || (cardObj.card_data ? cardObj.card_data.level : 0);
        const isMonster = (cardObj.type || '').includes('Monster') || (cardObj.card_data && (cardObj.card_data.type || '').includes('Monster'));

        // Si es monstruo de tributo (Nivel 5+), colocar tributos en campo
        if (isMonster && level >= 5) {
            duelState[pKey].monsters[1] = hydrateCardObject(89631139, pKey);
            duelState[pKey].monsters[1].position = 'ATK';
            duelState[pKey].monsters[1].faceDown = false;
            duelState[pKey].monsters[1].slot = 1;

            if (level >= 7) {
                duelState[pKey].monsters[2] = hydrateCardObject(70781052, pKey);
                duelState[pKey].monsters[2].position = 'ATK';
                duelState[pKey].monsters[2].faceDown = false;
                duelState[pKey].monsters[2].slot = 2;
            }
        }

        // Colocar monstruo y magia en campo rival para cartas de objetivo / destrucción
        const rivalKey = pKey === 'player1' ? 'player2' : 'player1';
        if (duelState[rivalKey]) {
            duelState[rivalKey].monsters[0] = hydrateCardObject(90357090, rivalKey);
            duelState[rivalKey].monsters[0].position = 'ATK';
            duelState[rivalKey].monsters[0].faceDown = false;
            duelState[rivalKey].monsters[0].slot = 0;

            duelState[rivalKey].spells[0] = hydrateCardObject(51482758, rivalKey);
            duelState[rivalKey].spells[0].position = 'SET';
            duelState[rivalKey].spells[0].faceDown = true;
            duelState[rivalKey].spells[0].slot = 0;
        }

        enrichDuelStateForBroadcast(duelState);
        const io = getIo();
        if (io) {
            io.to(actualRoomId).emit('DUEL_STATE_UPDATE', duelState);
        }

        return res.json({
            success: true,
            roomId: actualRoomId,
            cardName: cardObj.name,
            cardNameEs: cardObj.name_es,
            handLength: duelState[pKey].hand.length
        });
    } catch (err) {
        console.error('[TEST INJECT CARD ERROR]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}

async function getCardImage(req, res) {
    try {
        const cardId = parseInt(req.params.id, 10);
        if (!cardId) {
            return res.redirect('/assets/card_back.jpg');
        }

        const cacheDir = path.resolve(__dirname, '../../assets/images/cards_cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const localPath = path.join(cacheDir, `${cardId}.jpg`);
        if (fs.existsSync(localPath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');
            return res.sendFile(localPath);
        }

        // Descargar y cachear permanentemente en disco
        const remoteUrl = `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`;
        try {
            const fetchRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(4000) });
            if (fetchRes.ok) {
                const arrayBuf = await fetchRes.arrayBuffer();
                const buf = Buffer.from(arrayBuf);
                fs.writeFileSync(localPath, buf);
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=2592000');
                return res.send(buf);
            }
        } catch (fetchErr) {
            // fallback si no hay internet o falla ygoprodeck
        }

        return res.redirect('/assets/card_back.jpg');
    } catch (e) {
        return res.redirect('/assets/card_back.jpg');
    }
}

module.exports = {
    health,
    getCardById,
    getPacks,
    getPackById,
    getBatchCards,
    searchCards,
    getCountries,
    getGraveyard,
    testInjectCard,
    getCardImage
};
