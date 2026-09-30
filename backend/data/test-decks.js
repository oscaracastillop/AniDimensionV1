/**
 * Ani-Dimension: Generador de Mazos de Prueba (Player & NPC)
 */
const { fetchCardData, cardCache, LOCAL_CARDS } = require('./cards.data');

// MAZO DE INICIO DE 40 CARTAS (STARTER DECK) PARA JUGADORES Y NPC NIVEL 1
const STARTER_DECK_PASSCODES = [
    32274490, 32274490, 32274490, // Skull Servant x3
    76103675,                     // Sparks
    80813021,                     // Torike
    53293545,                     // Firegrass
    89091579,                     // Basic Insect
    36121917, 36121917,           // Monster Egg x2
    90357090,                     // Silver Fang
    76184692,                     // Hitotsu-Me Giant
    32452818,                     // Beaver Warrior
    9159938,                      // Dark Gray
    1784619,                      // Uraby
    57305373,                     // Two-Mouth Darkruler
    75356564, 75356564, 75356564, // Petit Dragon x3
    20060230,                     // Hard Armor
    44287299,                     // Masaki the Legendary Swordsman
    85705804, 85705804, 85705804, // Kurama x3
    72842870,                     // Tyhone
    53375573,                     // Dark King of the Abyss
    2863439,                      // Fiend Reflection #2
    17535588,                     // Armored Starfish
    85639257,                     // Aqua Madoor
    33064647,                     // One-Eyed Shield Dragon
    96851799,                     // Hinotama Soul
    56283725,                     // Kumootoko
    80770678,                     // Spirit of the Harp
    43500484,                     // Dark World Thorns
    16353197,                     // Drooling Lizard
    76211194,                     // Meda Bat
    73134081,                     // Final Flame
    46130346,                     // Hinotama
    63102017,                     // Stop Defense
    51482758,                     // Remove Trap
    50045229                      // Dragon Capture Jar
];

const { ocgCardReader } = require('./sql-card-reader');

function hydrateCardObject(rawCard, ownerKey = 'player1') {
    const cardId = parseInt(typeof rawCard === 'object' ? (rawCard.card_id || rawCard.id) : rawCard, 10);
    const dbCard = ocgCardReader(cardId);
    const base = dbCard || cardCache.get(cardId) || LOCAL_CARDS[cardId] || {
        id: cardId,
        card_id: cardId,
        name: (typeof rawCard === 'object' && rawCard.name) ? rawCard.name : `Carta #${cardId}`,
        type: (typeof rawCard === 'object' && rawCard.type) ? rawCard.type : "Normal Monster",
        race: (typeof rawCard === 'object' && rawCard.race) ? rawCard.race : "Warrior",
        attribute: (typeof rawCard === 'object' && rawCard.attribute) ? rawCard.attribute : "EARTH",
        level: (typeof rawCard === 'object' && rawCard.level) ? rawCard.level : 4,
        atk: (typeof rawCard === 'object' && rawCard.atk !== undefined) ? rawCard.atk : 1000,
        def: (typeof rawCard === 'object' && rawCard.def !== undefined) ? rawCard.def : 1000,
        desc: (typeof rawCard === 'object' && rawCard.desc) ? rawCard.desc : ''
    };

    return {
        ...base,
        id: cardId,
        card_id: cardId,
        image_url: `../../../assets/images/cards/${cardId}.jpg`,
        originalOwner: ownerKey
    };
}

function generateSampleDeck(ownerKey = 'player1') {
    const deck = STARTER_DECK_PASSCODES.map(cardId => hydrateCardObject(cardId, ownerKey));

    // Barajado Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function generateSampleExtraDeck(ownerKey) {
    const extraPool = [23995346, 98502113, 35809262, 25366484, 1546123, 99267150, 45231177, 63519819, 11901678, 66889139];
    return extraPool.map(cardId => hydrateCardObject(cardId, ownerKey));
}

function createInitialDuelState(roomId, player1Name, player2Name, player1Sleeve = 'default_sleeve', firstPlayer = 'player1', customPlayer1Deck = null) {
    let p1Deck = [];
    let p1Extra = [];

    // Si el jugador envió su propio mazo personalizado desde DeckManager (localStorage)
    if (customPlayer1Deck && Array.isArray(customPlayer1Deck.mainDeck) && customPlayer1Deck.mainDeck.length >= 40) {
        p1Deck = customPlayer1Deck.mainDeck.map(c => hydrateCardObject(c, 'player1'));

        if (Array.isArray(customPlayer1Deck.extraDeck)) {
            p1Extra = customPlayer1Deck.extraDeck.map(c => hydrateCardObject(c, 'player1'));
        }
    } else {
        p1Deck = generateSampleDeck('player1');
        p1Extra = [];
    }

    // Barajado Fisher-Yates del mazo principal del jugador
    for (let i = p1Deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p1Deck[i], p1Deck[j]] = [p1Deck[j], p1Deck[i]];
    }

    // Mazo del NPC Principiante (40 cartas del Starter Deck)
    const p2Deck = generateSampleDeck('player2');
    // EL NPC PRINCIPIANTE NO TIENE CARTAS EN EL EXTRA DECK
    const p2Extra = [];

    // Mano inicial reglamentaria de 5 cartas
    const p1Hand = p1Deck.splice(0, 5);
    const p2Hand = p2Deck.splice(0, 5);

    const startingTurnPlayer = firstPlayer === 'player2' ? (player2Name || 'NPC Principiante (Nv. 1)') : player1Name;

    const initialDuelState = {
        roomId: roomId,
        turnPlayer: startingTurnPlayer,
        phase: 'MAIN_1',
        turnNumber: 1,
        firstPlayer: firstPlayer,
        normalSummonUsed: false,
        activeChain: [],
        chainWindowActive: false,
        pendingAction: null,
        duelLogs: [
            { 
                message: `⚔️ ¡Comienza el Duelo Oficial Konami OCG! ${startingTurnPlayer} inicia de primeras (Turno 1: no se puede atacar).`, 
                type: "system", 
                timestamp: Date.now() 
            }
        ],
        extraMonsterZones: [null, null], // [EMZ_Left (col 3), EMZ_Right (col 5)]
        player1: {
            username: player1Name,
            lp: 8000,
            sleeve: player1Sleeve || 'default_sleeve',
            mat: 'default_mat',
            deck: p1Deck,
            mainDeckCount: p1Deck.length,
            extraDeck: p1Extra,
            extraDeckCount: p1Extra.length,
            graveyard: [],
            banished: [],
            fieldSpell: null,
            monsters: Array(5).fill(null), // CAMPO 100% LIMPIO AL INICIAR
            spells: Array(5).fill(null),   // CAMPO 100% LIMPIO AL INICIAR
            hand: p1Hand
        },
        player2: {
            username: player2Name || 'NPC Principiante (Nv. 1)',
            lp: 8000,
            sleeve: 'yugi_sleeve',
            mat: 'kaiba_mat',
            deck: p2Deck,
            mainDeckCount: p2Deck.length,
            extraDeck: p2Extra,
            extraDeckCount: p2Extra.length,
            graveyard: [],
            banished: [],
            fieldSpell: null,
            monsters: Array(5).fill(null), // CAMPO 100% LIMPIO AL INICIAR
            spells: Array(5).fill(null),   // CAMPO 100% LIMPIO AL INICIAR
            hand: p2Hand
        }
    };
    enrichDuelStateForBroadcast(initialDuelState);
    return initialDuelState;
}

// Mapas independientes para temporizadores y callbacks de cadenas (para evitar referencias circulares en WebSocket)
const roomChainTimers = new Map();
const roomChainCallbacks = new Map();

// Declaraciones de ámbito módulo para funciones de resolución de cadenas y ventanas OCG
let promptChainWindow = () => {};
let resolveActiveChain = () => {};
let executeCardEffect = () => {};
let proceedWithAttackExecution = () => {};

/**
 * REGLA OFICIAL KONAMI: Las cartas SIEMPRE regresan al Cementerio de su DUEÑO ORIGINAL,
 * sin importar quién las controlaba en el campo (ej. con Monstruo Renacido).
 */


module.exports = {
    hydrateCardObject,
    generateSampleDeck,
    generateSampleExtraDeck,
    createInitialDuelState
};
