const { getPool, sql } = require('../../config/db');

let cardIndexByName = null;
let cardIndexById = null;

async function initCardIndexes() {
    if (cardIndexByName && cardIndexById) return { cardIndexByName, cardIndexById };

    const pool = await getPool();
    const res = await pool.request().query(`
        SELECT d.id, d.type, t.name, t.name_es 
        FROM datas d 
        JOIN texts t ON d.id = t.id
    `);

    cardIndexByName = new Map();
    cardIndexById = new Map();

    res.recordset.forEach(r => {
        const typeNum = Number(r.type);
        let cardType = 'MONSTER';
        let isExtra = false;

        if (typeNum & 0x2) cardType = 'SPELL';
        else if (typeNum & 0x4) cardType = 'TRAP';
        else if (typeNum & 0x40) { cardType = 'FUSION'; isExtra = true; }
        else if (typeNum & 0x2000) { cardType = 'SYNCHRO'; isExtra = true; }
        else if (typeNum & 0x800000) { cardType = 'XYZ'; isExtra = true; }
        else if (typeNum & 0x4000000) { cardType = 'LINK'; isExtra = true; }

        const cardObj = {
            id: r.id,
            name: r.name,
            name_es: r.name_es,
            typeCode: typeNum,
            cardType: cardType,
            isExtra: isExtra
        };

        cardIndexById.set(r.id, cardObj);
        cardIndexByName.set(r.name.toLowerCase().trim(), cardObj);
    });

    console.log(`[DECK HELPER] Inicializado índice con ${cardIndexById.size} cartas oficiales.`);
    return { cardIndexByName, cardIndexById };
}

function resolveCard(cardRef) {
    if (typeof cardRef === 'number') {
        return cardIndexById.get(cardRef) || null;
    }
    if (typeof cardRef === 'string') {
        const num = Number(cardRef);
        if (!isNaN(num) && num > 100) {
            return cardIndexById.get(num) || null;
        }
        const key = cardRef.toLowerCase().trim();
        if (cardIndexByName.has(key)) return cardIndexByName.get(key);
        // Fuzzy search
        for (const [name, obj] of cardIndexByName.entries()) {
            if (name.includes(key) || key.includes(name)) return obj;
        }
    }
    return null;
}

/**
 * Normaliza un mazo a exactamente 40 cartas de Main Deck y hasta 15 de Extra Deck
 */
function normalizeDeck(npcId, deckDef, themeStaples = []) {
    const mainDeck = [];
    const extraDeck = [];

    // Procesar cartas principales definidas
    const rawMain = deckDef.main || [];
    for (const item of rawMain) {
        const ref = typeof item === 'object' ? item.name || item.id : item;
        const qty = (typeof item === 'object' && item.qty) ? item.qty : 1;
        const card = resolveCard(ref);
        if (card) {
            for (let q = 0; q < qty; q++) {
                if (card.isExtra) {
                    if (extraDeck.length < 15) extraDeck.push(card);
                } else {
                    if (mainDeck.length < 40) mainDeck.push(card);
                }
            }
        } else {
            console.warn(`[NPC #${npcId}] Carta no encontrada en catálogo: "${ref}"`);
        }
    }

    // Procesar Extra Deck definido
    const rawExtra = deckDef.extra || [];
    for (const item of rawExtra) {
        const ref = typeof item === 'object' ? item.name || item.id : item;
        const qty = (typeof item === 'object' && item.qty) ? item.qty : 1;
        const card = resolveCard(ref);
        if (card) {
            for (let q = 0; q < qty; q++) {
                if (extraDeck.length < 15) extraDeck.push(card);
            }
        }
    }

    // Si faltan cartas para completar 40 en el Main Deck, rellenar con themeStaples
    if (mainDeck.length < 40 && themeStaples.length > 0) {
        let stapleIdx = 0;
        while (mainDeck.length < 40 && stapleIdx < themeStaples.length * 3) {
            const stapleRef = themeStaples[stapleIdx % themeStaples.length];
            const card = resolveCard(stapleRef);
            if (card && !card.isExtra) {
                // No más de 3 copias de una misma carta
                const currentCopies = mainDeck.filter(c => c.id === card.id).length;
                if (currentCopies < 3) {
                    mainDeck.push(card);
                }
            }
            stapleIdx++;
        }
    }

    // Staples universales de Yu-Gi-Oh! anime si aún faltan
    const animeStaples = [
        'Pot of Greed', 'Monster Reborn', 'Swords of Revealing Light', 'Mystical Space Typhoon',
        'Mirror Force', 'Dark Hole', 'Heavy Storm', 'Call of the Haunted', 'Torrential Tribute',
        'Magic Cylinder', 'Waboku', 'Sangan', 'Witch of the Black Forest', 'Mystical Elf', 'Celtic Guardian',
        'Fissure', 'Trap Hole', 'Bottomless Trap Hole', 'Premature Burial', 'Card Destruction',
        'Scapegoat', 'Raigeki', 'Change of Heart', 'Graceful Charity', 'Dust Tornado',
        'Compulsory Evacuation Device', 'Book of Moon', 'Smashing Ground', 'Sakuretsu Armor',
        'D.D. Warrior Lady', 'Breaker the Magical Warrior', 'Giant Trunade', 'Snatch Steal'
    ];
    let sIdx = 0;
    while (mainDeck.length < 40 && sIdx < animeStaples.length * 3) {
        const stapleRef = animeStaples[sIdx % animeStaples.length];
        const card = resolveCard(stapleRef);
        if (card && !card.isExtra) {
            const currentCopies = mainDeck.filter(c => c.id === card.id).length;
            if (currentCopies < 3) mainDeck.push(card);
        }
        sIdx++;
    }

    // Recortar si excede 40
    const finalMain = mainDeck.slice(0, 40);

    return {
        npcId,
        main: finalMain,
        extra: extraDeck
    };
}

/**
 * Inserta las cartas del mazo en dbo.NpcDeckCards
 */
async function saveNpcDeckToDb(pool, normalizedDeck) {
    const { npcId, main, extra } = normalizedDeck;

    // Eliminar cartas anteriores del NPC
    await pool.request()
        .input('npcId', sql.Int, npcId)
        .query('DELETE FROM dbo.NpcDeckCards WHERE NpcId = @npcId');

    // Insertar Main Deck
    for (let i = 0; i < main.length; i++) {
        const card = main[i];
        await pool.request()
            .input('npcId', sql.Int, npcId)
            .input('cardCode', sql.BigInt, card.id)
            .input('cardName', sql.NVarChar(150), card.name)
            .input('cardType', sql.NVarChar(50), card.cardType)
            .input('section', sql.NVarChar(10), 'MAIN')
            .input('slotOrder', sql.Int, i + 1)
            .query(`
                INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder)
                VALUES (@npcId, @cardCode, @cardName, @cardType, @section, 1, @slotOrder)
            `);
    }

    // Insertar Extra Deck
    for (let i = 0; i < extra.length; i++) {
        const card = extra[i];
        await pool.request()
            .input('npcId', sql.Int, npcId)
            .input('cardCode', sql.BigInt, card.id)
            .input('cardName', sql.NVarChar(150), card.name)
            .input('cardType', sql.NVarChar(50), card.cardType)
            .input('section', sql.NVarChar(10), 'EXTRA')
            .input('slotOrder', sql.Int, i + 1)
            .query(`
                INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder)
                VALUES (@npcId, @cardCode, @cardName, @cardType, @section, 1, @slotOrder)
            `);
    }
}

module.exports = {
    initCardIndexes,
    resolveCard,
    normalizeDeck,
    saveNpcDeckToDb
};
