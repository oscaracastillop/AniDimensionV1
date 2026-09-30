/**
 * Ani-Dimension: Estado Global de Duelos y Reglas Oficiales OCG
 */
const { generateSampleDeck, generateSampleExtraDeck, hydrateCardObject } = require('../data/test-decks');
const { ocgLuaRunner } = require('../ocgcore/lua-runner');

const duelRooms = new Map();
const roomChainTimers = new Map();
const roomChainCallbacks = new Map();

let ioInstance = null;

function setIo(io) {
    ioInstance = io;
}

function getIo() {
    return ioInstance;
}

function emitDuelLog(roomId, message, type = 'info') {
    const duelState = duelRooms.get(roomId);
    if (duelState) {
        if (!duelState.duelLogs) duelState.duelLogs = [];
        const logItem = { message, type, timestamp: Date.now() };
        duelState.duelLogs.push(logItem);
        if (duelState.duelLogs.length > 50) duelState.duelLogs.shift();
    }
    const io = getIo();
    if (io) {
        io.to(roomId).emit('OCG_EVENT_LOG', { message, type, timestamp: Date.now() });
    }
    console.log(`[OCG LOG - ${roomId}] ${message}`);
}

function createInitialDuelState(roomId, player1Name, player2Name, player1Sleeve = 'default_sleeve', firstPlayer = 'player1', customPlayer1Deck = null) {
    let p1Deck = [];
    let p1Extra = [];

    // SI EL JUGADOR ENVÍA SU MAZO PERSONALIZADO DESDE DECK MANAGER (localStorage)
    if (customPlayer1Deck && Array.isArray(customPlayer1Deck.mainDeck) && customPlayer1Deck.mainDeck.length >= 40) {
        console.log(`[DUEL STATE] Cargando mazo personalizado del usuario (${customPlayer1Deck.mainDeck.length} cartas main, ${(customPlayer1Deck.extraDeck || []).length} cartas extra)...`);
        p1Deck = customPlayer1Deck.mainDeck.map(c => hydrateCardObject(c, 'player1'));

        if (Array.isArray(customPlayer1Deck.extraDeck)) {
            p1Extra = customPlayer1Deck.extraDeck.map(c => hydrateCardObject(c, 'player1'));
        }
    } else {
        console.log(`[DUEL STATE] Cargando mazo reglamentario inicial por defecto para el jugador...`);
        p1Deck = generateSampleDeck('player1');
        p1Extra = [];
    }

    // Barajado Fisher-Yates para el mazo principal del jugador
    for (let i = p1Deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p1Deck[i], p1Deck[j]] = [p1Deck[j], p1Deck[i]];
    }

    // Mazo del NPC Principiante Nivel 1 (40 cartas del Starter Deck)
    const p2Deck = generateSampleDeck('player2');
    // REGLA SOLICITADA: EL NPC PRINCIPIANTE NIVEL 1 TIENE CERO (0) CARTAS EN EL EXTRA DECK
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
// roomChainTimers hoisted
// roomChainCallbacks hoisted

// Declaraciones de ámbito módulo para funciones de resolución de cadenas y ventanas OCG
// declared in ocg-engine
// declared in ocg-engine
// declared in ocg-engine
// declared in ocg-engine

/**
 * REGLA OFICIAL KONAMI: Las cartas SIEMPRE regresan al Cementerio de su DUEÑO ORIGINAL,
 * sin importar quién las controlaba en el campo (ej. con Monstruo Renacido).
 */
function sendCardToGraveyard(duelState, card, controllerKey = 'player1') {
    if (!card) return;
    const cardData = card.card_data || card;
    const targetOwner = card.originalOwner || cardData.originalOwner || controllerKey;
    const ownerObj = duelState[targetOwner] || duelState[controllerKey];
    if (ownerObj && ownerObj.graveyard) {
        ownerObj.graveyard.push(cardData);
    }

    // REGLA OFICIAL OCG: Si la carta que va al cementerio estaba apuntando continuamente a un monstruo (ej. Círculo Atador de Hechizos),
    // el monstruo queda libre de dicha restricción al destruirse la carta continua.
    if (card.targetingMonster) {
        const tPlayer = duelState[card.targetingMonster.player];
        if (tPlayer && tPlayer.monsters && tPlayer.monsters[card.targetingMonster.slot]) {
            const mon = tPlayer.monsters[card.targetingMonster.slot];
            if (mon && mon.attachedEffects) {
                mon.attachedEffects = mon.attachedEffects.filter(e => e.card_id !== (card.card_id || card.id));
                if (!mon.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK')) {
                    mon.isTrapped = false;
                }
            }
            emitDuelLog(duelState.roomId, `✨ ${mon.card_data ? mon.card_data.name : 'Monstruo'} fue liberado de la restricción al ser destruida la carta continua.`, 'spell');
        }
    }

    // REGLA OFICIAL OCG: Si el monstruo que va al Cementerio tenía cartas continuas o de equipo asignadas,
    // dichas cartas pierden su objetivo y son enviadas al cementerio de sus respectivos dueños.
    if (card.attachedEffects && Array.isArray(card.attachedEffects) && card.attachedEffects.length > 0) {
        card.attachedEffects.forEach(eff => {
            if (eff.source_player && eff.source_slot !== undefined && eff.source_slot >= 0) {
                const sPlayer = duelState[eff.source_player];
                if (sPlayer && sPlayer.spells && sPlayer.spells[eff.source_slot]) {
                    const stCard = sPlayer.spells[eff.source_slot];
                    sPlayer.spells[eff.source_slot] = null;
                    sendCardToGraveyard(duelState, stCard, eff.source_player);
                    emitDuelLog(duelState.roomId, `🎴 [Regla OCG] "${stCard.card_data ? stCard.card_data.name : 'Carta Continua'}" fue enviada al Cementerio porque su objetivo dejó el campo.`, 'phase');
                }
            }
        });
        card.attachedEffects = [];
        card.isTrapped = false;
    }
}

function sendCardToBanished(duelState, card, controllerKey = 'player1') {
    if (!card) return;
    const cardData = card.card_data || card;
    const targetOwner = card.originalOwner || cardData.originalOwner || controllerKey;
    const ownerObj = duelState[targetOwner] || duelState[controllerKey];
    if (ownerObj && ownerObj.banished) {
        ownerObj.banished.push(cardData);
    }
}

/**
 * MOTOR DE CÁLCULO DE ESTADÍSTICAS DINÁMICAS (MAGIAS DE CAMPO Y BONIFICACIONES)
 */
function calculateMonsterCurrentStats(monster, duelState) {
    if (!monster) return null;
    const cardData = monster.card_data || monster;
    if (!cardData) return null;

    const baseAtk = cardData.atk !== null && cardData.atk !== undefined ? parseInt(cardData.atk, 10) : null;
    const baseDef = cardData.def !== null && cardData.def !== undefined ? parseInt(cardData.def, 10) : null;

    if (baseAtk === null) return null;

    let atkMod = monster.equipAtkMod !== undefined ? monster.equipAtkMod : 0;
    let defMod = monster.equipDefMod !== undefined ? monster.equipDefMod : 0;

    // REGLA OFICIAL OCG: Los efectos continuos de campo se calculan 100% mediante los scripts oficiales Konami Lua
    const activeFieldCardIds = [];
    if (duelState.player1 && duelState.player1.fieldSpell) {
        const id = duelState.player1.fieldSpell.card_id || (duelState.player1.fieldSpell.card_data && duelState.player1.fieldSpell.card_data.id);
        if (id) activeFieldCardIds.push(id);
    }
    if (duelState.player2 && duelState.player2.fieldSpell) {
        const id = duelState.player2.fieldSpell.card_id || (duelState.player2.fieldSpell.card_data && duelState.player2.fieldSpell.card_data.id);
        if (id) activeFieldCardIds.push(id);
    }

    if (activeFieldCardIds.length > 0) {
        const luaMods = ocgLuaRunner.calculateFieldStatModsSync(monster, activeFieldCardIds);
        atkMod += luaMods.atkMod;
        defMod += luaMods.defMod;
    }

    // Buster Blader (78193831): Gana 500 ATK por cada monstruo Dragón en el campo del oponente o en su Cementerio
    if (cardData.id === 78193831) {
        let opponentObj = null;
        if (duelState.player1 && duelState.player1.monsters && duelState.player1.monsters.includes(monster)) {
            opponentObj = duelState.player2;
        } else if (duelState.player2 && duelState.player2.monsters && duelState.player2.monsters.includes(monster)) {
            opponentObj = duelState.player1;
        }
        if (opponentObj) {
            let dragonCount = 0;
            if (opponentObj.monsters) {
                opponentObj.monsters.forEach(m => {
                    if (m && m.card_data && m.card_data.race && m.card_data.race.toLowerCase() === 'dragon') {
                        dragonCount++;
                    }
                });
            }
            if (opponentObj.graveyard) {
                opponentObj.graveyard.forEach(c => {
                    if (c && c.race && c.race.toLowerCase() === 'dragon') {
                        dragonCount++;
                    }
                });
            }
            atkMod += dragonCount * 500;
        }
    }

    const currentAtk = Math.max(0, baseAtk + atkMod);
    const currentDef = baseDef !== null ? Math.max(0, baseDef + defMod) : null;

    monster.currentAtk = currentAtk;
    monster.currentDef = currentDef;
    monster.atkMod = atkMod;
    monster.defMod = defMod;

    return {
        baseAtk,
        baseDef,
        atkMod,
        defMod,
        currentAtk,
        currentDef
    };
}

function enrichDuelStateForBroadcast(duelState) {
    if (!duelState) return;
    ['player1', 'player2'].forEach(pKey => {
        const p = duelState[pKey];
        if (p && p.monsters) {
            p.monsters.forEach(m => {
                if (m) {
                    if (!m.attachedEffects) m.attachedEffects = [];
                    m.isTrapped = m.isTrapped || m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK');
                    const stats = calculateMonsterCurrentStats(m, duelState);
                    if (stats) {
                        m.currentAtk = stats.currentAtk;
                        m.currentDef = stats.currentDef;
                        m.atkMod = stats.atkMod;
                        m.defMod = stats.defMod;
                    }
                }
            });
        }
    });
}

// emitDuelLog hoisted


/**
 * ============================================================================
 * CONDICIONES OFICIALES DE FIN DE DUELO OCG (LP A 0 Y DECK OUT)
 * ============================================================================
 */
function checkDuelGameOver(roomId, duelState) {
    if (!duelState || duelState.isGameOver) return true;

    const p1 = duelState.player1;
    const p2 = duelState.player2;

    if (p1.lp <= 0 && p2.lp <= 0) {
        duelState.isGameOver = true;
        emitDuelLog(roomId, `⚔️💥 ¡EMPATE! Los LP de ambos duelistas llegaron a 0 simultáneamente.`, 'game_over');
        if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', { winner: 'EMPATE', loser: null, reason: 'TIE' });
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        duelRooms.delete(roomId);
        return true;
    }

    if (p2.lp <= 0) {
        duelState.isGameOver = true;
        emitDuelLog(roomId, `🏆 ¡VICTORIA! Los LP de ${p2.username} llegaron a 0. ¡${p1.username} gana el duelo!`, 'game_over');
        if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', { winner: p1.username, loser: p2.username, reason: 'LP_ZERO' });
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        duelRooms.delete(roomId);
        return true;
    }

    if (p1.lp <= 0) {
        duelState.isGameOver = true;
        emitDuelLog(roomId, `💀 DERROTA. Los LP de ${p1.username} cayeron a 0. ¡Victoria para ${p2.username}!`, 'game_over');
        if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', { winner: p2.username, loser: p1.username, reason: 'LP_ZERO' });
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        duelRooms.delete(roomId);
        return true;
    }

    return false;
}

function checkDeckOut(roomId, duelState, playerKey) {
    if (!duelState || duelState.isGameOver) return true;
    const player = duelState[playerKey];
    const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
    const opponent = duelState[opponentKey];

    if (!player.deck || player.deck.length === 0) {
        duelState.isGameOver = true;
        emitDuelLog(roomId, `💀 DERROTA POR DECK OUT. ${player.username} se quedó sin cartas al intentar robar. ¡Victoria para ${opponent.username}!`, 'game_over');
        if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', { winner: opponent.username, loser: player.username, reason: 'DECK_OUT' });
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        duelRooms.delete(roomId);
        return true;
    }
    return false;
}

function checkTributesNeeded(level) {
    if (!level || level <= 4) return 0;
    if (level === 5 || level === 6) return 1;
    return 2; // Nivel 7 o superior
}

/**
 * Inteligencia Artificial del NPC (PvE Automatizado en Ranuras 0..4)
 */


module.exports = {
    duelRooms,
    roomChainTimers,
    roomChainCallbacks,
    setIo,
    getIo,
    emitDuelLog,
    createInitialDuelState,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver,
    checkDeckOut,
    checkTributesNeeded
};
