/**
 * ============================================================================
 * ANI-DIMENSION: SERVICIO CENTRAL DE CATÁLOGO DE SOBRES Y CARTAS OCG
 * 100% CONSULTADO DE FORMA NATIVA DESDE SQL SERVER (dbo.BoosterPackCards & dbo.BoosterPacks)
 * ============================================================================
 */
const { getPool, sql } = require('../config/db');

/**
 * Obtener lista de cartas de un sobre directamente desde SQL Server
 * SP: dbo.sp_ObtenerCartasDeSobres
 */
async function getRawCardsForPack(packCode) {
    const code = (packCode || 'LOB').toUpperCase();
    try {
        const pool = await getPool();
        const res = await pool.request()
            .input('PackId', sql.NVarChar(50), code)
            .execute('dbo.sp_ObtenerCartasDeSobres');

        return (res.recordset || []).map(r => ({
            card_id: r.CardId,
            id: r.CardId,
            name: r.CardName,
            name_es: r.CardNameEs || r.CardName,
            set: r.CardNumber,
            card_number: r.CardNumber,
            type: r.CardType,
            atk: r.Atk,
            def: r.Def,
            level: r.Level,
            attribute: r.Attribute,
            race: r.Race,
            desc: r.Description,
            desc_es: r.DescriptionEs || r.Description,
            description: r.Description,
            description_es: r.DescriptionEs || r.Description,
            rarity: r.Rarity,
            active: Boolean(r.IsActive),
            pack_drop: Boolean(r.PackDrop),
            deck_usable: Boolean(r.DeckUsable),
            npc_drop: Boolean(r.NpcDrop),
            image: r.ImageUrl,
            image_large: r.ImageLargeUrl
        }));
    } catch (err) {
        console.error(`[PACK CATALOG SERVICE] Error al consultar cartas del sobre ${code} en SQL:`, err.message);
        return [];
    }
}

/**
 * Obtener información de un sobre y sus cartas combinadas desde SQL Server
 */
async function getPackCardsWithDbOverrides(poolParam, packId) {
    const code = (packId || 'LOB').toUpperCase();
    const pool = poolParam || await getPool();

    // 1. Consultar estado y configuración del sobre en dbo.BoosterPacks
    const packQuery = await pool.request()
        .input('PackId', sql.NVarChar(50), code)
        .query('SELECT PackId, Name, Code, Series, Price, OfferText, Image, Description, CardsPerPack, IsActive, IsVisible FROM dbo.BoosterPacks WHERE PackId = @PackId');

    const dbPack = packQuery.recordset && packQuery.recordset[0] ? packQuery.recordset[0] : null;

    // 2. Obtener cartas desde dbo.sp_ObtenerCartasDeSobres
    const cardsRes = await pool.request()
        .input('PackId', sql.NVarChar(50), code)
        .execute('dbo.sp_ObtenerCartasDeSobres');

    const resolvedCards = (cardsRes.recordset || []).map(r => ({
        card_id: r.CardId,
        id: r.CardId,
        name: r.CardName,
        name_es: r.CardNameEs || r.CardName,
        set: r.CardNumber,
        card_number: r.CardNumber,
        type: r.CardType,
        atk: r.Atk,
        def: r.Def,
        level: r.Level,
        attribute: r.Attribute,
        race: r.Race,
        desc: r.Description,
        desc_es: r.DescriptionEs || r.Description,
        description: r.Description,
        description_es: r.DescriptionEs || r.Description,
        rarity: r.Rarity,
        active: Boolean(r.IsActive),
        pack_drop: Boolean(r.PackDrop),
        deck_usable: Boolean(r.DeckUsable),
        npc_drop: Boolean(r.NpcDrop),
        image: r.ImageUrl,
        image_large: r.ImageLargeUrl
    }));

    return {
        dbPack,
        cards: resolvedCards,
        overridesCount: 0
    };
}

/**
 * Obtener el grupo de cartas estrictamente elegibles para compra y apertura de sobres en la tienda
 * Filtra cartas con IsActive = 0 o PackDrop = 0 en SQL Server
 */
async function getEligiblePackOpeningPool(pool, packId) {
    const { dbPack, cards } = await getPackCardsWithDbOverrides(pool, packId);

    if (!dbPack || !dbPack.IsActive) {
        return {
            dbPack,
            eligibleCards: [],
            isPackActive: false
        };
    }

    const eligibleCards = cards.filter(c => {
        if (c.active === false) return false;
        if (c.pack_drop === false) return false;
        return true;
    });

    return {
        dbPack,
        eligibleCards,
        isPackActive: true
    };
}

/**
 * Obtener el grupo de cartas estrictamente elegibles para drop de duelos NPC / PvP
 * Filtra cartas con IsActive = 0 o NpcDrop = 0 en SQL Server
 */
async function getEligibleNpcDropPool(pool, packId) {
    const { dbPack, cards } = await getPackCardsWithDbOverrides(pool, packId);

    if (!dbPack || !dbPack.IsActive) {
        return [];
    }

    return cards.filter(c => {
        if (c.active === false) return false;
        if (c.npc_drop === false) return false;
        return true;
    });
}

module.exports = {
    getRawCardsForPack,
    getPackCardsWithDbOverrides,
    getEligiblePackOpeningPool,
    getEligibleNpcDropPool
};
