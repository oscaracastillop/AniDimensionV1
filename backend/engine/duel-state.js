/**
 * Ani-Dimension: Estado Global de Duelos y Reglas Oficiales OCG
 */
const { generateSampleDeck, generateSampleExtraDeck, hydrateCardObject } = require('../data/test-decks');
const { puzzleService } = require('./puzzle-service');
const { progressionService } = require('./progression-service');
const { pvpBonusService } = require('./pvp-bonus-service');
const { getPool, sql } = require('../config/db');
const duelLogger = require('./duel-logger');
const { initializeRoomManifest, getRoomManifest } = require('./room-manifest');

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

const fs = require('fs');
const path = require('path');
const LOG_FILE_PATH = path.join(__dirname, '../../scratch/duel_live_events.log');

function emitDuelLog(roomId, message, type = 'info', metadata = null) {
    const duelState = duelRooms.get(roomId);
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const logItem = { 
        message, 
        type, 
        timestamp: Date.now(), 
        timeStr,
        turnNumber: duelState ? duelState.turnNumber : 0,
        phase: duelState ? duelState.phase : '',
        p1Lp: duelState && duelState.player1 ? duelState.player1.lp : 0,
        p2Lp: duelState && duelState.player2 ? duelState.player2.lp : 0,
        metadata: metadata || undefined
    };

    if (duelState) {
        if (!duelState.duelLogs) duelState.duelLogs = [];
        duelState.duelLogs.push(logItem);
        if (duelState.duelLogs.length > 300) duelState.duelLogs.shift();
    }
    const io = getIo();
    if (io) {
        io.to(roomId).emit('OCG_EVENT_LOG', logItem);
    }
    const metaStr = metadata ? ` | META: ${JSON.stringify(metadata)}` : '';
    const consoleEntry = `[${timeStr}] [DUEL:${roomId}] [${type.toUpperCase()}] ${message}${metaStr}`;
    console.log(consoleEntry);

    // 1. Escritura permanente en el Text Log del Duelo
    try {
        duelLogger.logDuelEvent(roomId, {
            turnNumber: logItem.turnNumber,
            phase: logItem.phase,
            p1Lp: logItem.p1Lp,
            p2Lp: logItem.p2Lp,
            type,
            message,
            metadata
        });
    } catch (e) {}

    // 2. Buffer secundario de scratch
    try {
        const scratchDir = path.join(__dirname, '../../scratch');
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
        fs.appendFile(LOG_FILE_PATH, consoleEntry + '\n', () => {});
    } catch (e) {}
}

function createInitialDuelState(roomId, player1Name, player2Name, player1Sleeve = 'default_sleeve', firstPlayer = 'player1', customPlayer1Deck = null, customPlayer2Deck = null, player2Sleeve = 'yugi_sleeve', player1Mat = 'default_mat', player2Mat = 'kaiba_mat') {
    let p1Deck = [];
    let p1Extra = [];
    let p2Deck = [];
    let p2Extra = [];

    // 1. Mazo del Jugador 1
    const p1MainRaw = Array.isArray(customPlayer1Deck) ? customPlayer1Deck : (customPlayer1Deck && Array.isArray(customPlayer1Deck.mainDeck) ? customPlayer1Deck.mainDeck : null);
    const p1ExtraRaw = customPlayer1Deck && Array.isArray(customPlayer1Deck.extraDeck) ? customPlayer1Deck.extraDeck : [];
    if (p1MainRaw && p1MainRaw.length > 0) {
        console.log(`[DUEL STATE] Cargando mazo personalizado del Jugador 1 (${p1MainRaw.length} cartas main, ${p1ExtraRaw.length} cartas extra)...`);
        p1Deck = p1MainRaw.map(c => hydrateCardObject(c, 'player1'));
        p1Extra = p1ExtraRaw.map(c => hydrateCardObject(c, 'player1'));
    } else {
        console.warn('[DUEL STATE] Jugador 1 no tiene mazo configurado. No se inyecta mazo de muestra.');
        p1Deck = [];
        p1Extra = [];
    }

    // Barajado Fisher-Yates para el mazo principal de P1
    for (let i = p1Deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p1Deck[i], p1Deck[j]] = [p1Deck[j], p1Deck[i]];
    }

    // 2. Mazo del Jugador 2 (o NPC)
    const p2MainRaw = Array.isArray(customPlayer2Deck) ? customPlayer2Deck : (customPlayer2Deck && Array.isArray(customPlayer2Deck.mainDeck) ? customPlayer2Deck.mainDeck : null);
    const p2ExtraRaw = customPlayer2Deck && Array.isArray(customPlayer2Deck.extraDeck) ? customPlayer2Deck.extraDeck : [];
    if (p2MainRaw && p2MainRaw.length >= 20) {
        console.log(`[DUEL STATE] Cargando mazo personalizado del Jugador 2 (${p2MainRaw.length} cartas main, ${p2ExtraRaw.length} cartas extra)...`);
        p2Deck = p2MainRaw.map(c => hydrateCardObject(c, 'player2'));
        p2Extra = p2ExtraRaw.map(c => hydrateCardObject(c, 'player2'));
    } else {
        p2Deck = generateSampleDeck('player2');
        p2Extra = [];
    }

    // Barajado Fisher-Yates para el mazo principal de P2
    for (let i = p2Deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p2Deck[i], p2Deck[j]] = [p2Deck[j], p2Deck[i]];
    }

    // Mano inicial reglamentaria de 5 cartas
    const p1Hand = p1Deck.splice(0, 5);
    const p2Hand = p2Deck.splice(0, 5);

    const startingTurnPlayer = firstPlayer === 'player2' ? (player2Name || 'NPC Principiante (Nv. 1)') : player1Name;

    const initialDuelState = {
        roomId: roomId,
        turnPlayer: startingTurnPlayer,
        phase: 'DRAW',
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
            mat: player1Mat || 'default_mat',
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
            sleeve: player2Sleeve || 'yugi_sleeve',
            mat: player2Mat || 'kaiba_mat',
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

    try {
        const isPvp = roomId.startsWith('PVP_');
        const isAdv = !isPvp && Boolean(player2Name && (player2Name.includes('Nv.') || player2Name.includes('(')));
        duelLogger.initDuelLog(roomId, player1Name, player2Name, {
            isPvp,
            isAdventure: isAdv,
            p1DeckCount: p1Deck.length,
            p2DeckCount: p2Deck.length
        });
    } catch (e) {}
    initializeRoomManifest(initialDuelState);
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

function cleanAttachedEquipsAndContinuousEffects(duelState, card, controllerKey = 'player1') {
    if (!card || !duelState) return;
    const cardId = Number(card.card_id || card.id || (card.card_data && card.card_data.id) || 0);

    // 1. Si la carta que dejó el campo es un monstruo que tenía equipos o trampas continuas encima:
    if (card.attachedEffects && Array.isArray(card.attachedEffects) && card.attachedEffects.length > 0) {
        const effectsToClean = [...card.attachedEffects];
        card.attachedEffects = [];
        card.isTrapped = false;
        card.equipAtkMod = 0;
        card.equipDefMod = 0;

        effectsToClean.forEach(eff => {
            const effCardId = Number(eff.card_id || eff.id || 0);

            // Intentar primero con las coordenadas directas (source_player y source_slot)
            if (eff.source_player && eff.source_slot !== undefined && eff.source_slot >= 0) {
                const sPlayer = duelState[eff.source_player];
                if (sPlayer && sPlayer.spells && sPlayer.spells[eff.source_slot]) {
                    const stCard = sPlayer.spells[eff.source_slot];
                    sPlayer.spells[eff.source_slot] = null;
                    sendCardToGraveyard(duelState, stCard, eff.source_player);
                    emitDuelLog(duelState.roomId, `🎴 [Regla Oficial] "${stCard.card_data ? stCard.card_data.name : 'Carta de Equipo'}" fue destruida y enviada al Cementerio porque su monstruo equipado dejó el campo.`, 'phase');
                    return;
                }
            }

            // Búsqueda exhaustiva en las zonas de Magias/Trampas de ambos jugadores
            ['player1', 'player2'].forEach(pKey => {
                const pObj = duelState[pKey];
                if (pObj && pObj.spells) {
                    for (let sIdx = 0; sIdx < 5; sIdx++) {
                        const sCard = pObj.spells[sIdx];
                        if (sCard) {
                            const sId = Number(sCard.card_id || (sCard.card_data && sCard.card_data.id) || 0);
                            const targetsThis = sCard.targetingMonster && 
                                sCard.targetingMonster.player === controllerKey && 
                                (card.slotIndex !== undefined ? sCard.targetingMonster.slot === card.slotIndex : true);
                            
                            if (targetsThis || (effCardId > 0 && sId === effCardId)) {
                                pObj.spells[sIdx] = null;
                                sendCardToGraveyard(duelState, sCard, pKey);
                                emitDuelLog(duelState.roomId, `🎴 [Regla Oficial] "${sCard.card_data ? sCard.card_data.name : 'Carta de Equipo'}" fue destruida y enviada al Cementerio porque su monstruo equipado dejó el campo.`, 'phase');
                                break;
                            }
                        }
                    }
                }
            });
        });
    }

    // 2. Si la carta que dejó el campo es una Carta Mágica de Equipo o Magia/Trampa Continua:
    // Remover de INMEDIATO su efecto de cualquier monstruo en el campo de CUALQUIERA de los dos jugadores
    ['player1', 'player2'].forEach(pKey => {
        const pObj = duelState[pKey];
        if (pObj && pObj.monsters) {
            pObj.monsters.forEach(m => {
                if (m && m.attachedEffects && Array.isArray(m.attachedEffects)) {
                    const hadEffect = m.attachedEffects.some(e => Number(e.card_id || e.id) === cardId);
                    if (hadEffect) {
                        m.attachedEffects = m.attachedEffects.filter(e => Number(e.card_id || e.id) !== cardId);
                        m.equipAtkMod = 0;
                        m.equipDefMod = 0;
                        if (!m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK')) {
                            m.isTrapped = false;
                        }
                        calculateMonsterCurrentStats(m, duelState, pKey);
                        emitDuelLog(duelState.roomId, `🗡️✨ [Regla Oficial] "${card.card_data ? card.card_data.name : 'Carta de Equipo'}" fue destruida; "${m.card_data ? m.card_data.name : 'Monstruo'}" pierde el bono y recupera sus estadísticas normales.`, 'spell');
                    }
                }
            });
        }
    });

    // 3. Si la carta tenía targetingMonster explícito
    if (card.targetingMonster) {
        const tPlayer = duelState[card.targetingMonster.player];
        if (tPlayer && tPlayer.monsters && tPlayer.monsters[card.targetingMonster.slot]) {
            const mon = tPlayer.monsters[card.targetingMonster.slot];
            if (mon && mon.attachedEffects) {
                mon.attachedEffects = mon.attachedEffects.filter(e => Number(e.card_id || e.id) !== cardId);
                if (!mon.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK')) {
                    mon.isTrapped = false;
                }
                calculateMonsterCurrentStats(mon, duelState, card.targetingMonster.player);
            }
            emitDuelLog(duelState.roomId, `✨ "${mon.card_data ? mon.card_data.name : 'Monstruo'}" fue liberado de la restricción continua.`, 'spell');
        }
    }

    // 4. Barrido reglamentario de Magias de Equipo huérfanas en todo el campo
    cleanupOrphanedEquipCards(duelState);
}

/**
 * REGLA OFICIAL KONAMI OCG:
 * Si un monstruo equipado abandona el campo (destruido en combate, por efecto, sacrificado o devuelto a la mano),
 * las Cartas Mágicas de Equipo equipadas a él pierden su objetivo y se destruyen de inmediato enviándose al Cementerio.
 */
function cleanupOrphanedEquipCards(duelState) {
    if (!duelState) return;

    ['player1', 'player2'].forEach(pKey => {
        const pObj = duelState[pKey];
        if (pObj && pObj.spells) {
            for (let sIdx = 0; sIdx < 5; sIdx++) {
                const sCard = pObj.spells[sIdx];
                if (sCard && (!sCard.faceDown && sCard.position !== 'SET')) {
                    const cData = sCard.card_data || sCard;
                    const cId = Number(sCard.card_id || cData.id || 0);
                    const isEquip = cData.race === 'Equip' || (cData.type && typeof cData.type === 'string' && cData.type.includes('Equip'));

                    if (isEquip) {
                        let isStillAttached = false;
                        // 1. Verificar si targetingMonster apunta a un monstruo aún existente en el campo
                        if (sCard.targetingMonster) {
                            const tPlayer = duelState[sCard.targetingMonster.player];
                            const tMon = tPlayer && tPlayer.monsters && tPlayer.monsters[sCard.targetingMonster.slot];
                            if (tMon && !tMon.faceDown) {
                                isStillAttached = true;
                            }
                        }
                        // 2. Verificar si algún monstruo en ambos campos tiene esta carta en attachedEffects
                        if (!isStillAttached) {
                            ['player1', 'player2'].forEach(ownerK => {
                                (duelState[ownerK]?.monsters || []).forEach(m => {
                                    if (m && m.attachedEffects && m.attachedEffects.some(e => Number(e.card_id || e.id) === cId)) {
                                        isStillAttached = true;
                                    }
                                });
                            });
                        }

                        // Si no hay monstruo objetivo en el campo, la carta de equipo es destruida
                        if (!isStillAttached) {
                            pObj.spells[sIdx] = null;
                            sendCardToGraveyard(duelState, sCard, pKey);
                            emitDuelLog(duelState.roomId, `🎴 [Regla Oficial] "${cData.name || 'Carta de Equipo'}" fue destruida y enviada al Cementerio porque su monstruo equipado dejó el campo.`, 'phase');
                        }
                    }
                }
            }
        }
    });
}

function recalculateAllFieldMonstersStats(duelState) {
    if (!duelState) return;
    ['player1', 'player2'].forEach(pKey => {
        const p = duelState[pKey];
        if (p && p.monsters) {
            p.monsters.forEach(m => {
                if (m) calculateMonsterCurrentStats(m, duelState, pKey);
            });
        }
    });
}

/**
 * REGLA OFICIAL KONAMI: Las cartas SIEMPRE regresan al Cementerio de su DUEÑO ORIGINAL,
 * sin importar quién las controlaba en el campo (ej. con Monstruo Renacido).
 */
function sendCardToGraveyard(duelState, card, controllerKey = 'player1') {
    if (!card) return;
    if (typeof card === 'string' && typeof controllerKey === 'object') {
        const tmp = card;
        card = controllerKey;
        controllerKey = tmp;
    }
    if (!card) return;
    const cardData = card.card_data || card;
    const targetOwner = card.originalOwner || cardData.originalOwner || controllerKey;
    const ownerObj = duelState[targetOwner] || duelState[controllerKey];
    if (ownerObj && ownerObj.graveyard) {
        ownerObj.graveyard.push(cardData);
    }

    // Limpiar equipos y efectos continuos asociados
    cleanAttachedEquipsAndContinuousEffects(duelState, card, controllerKey);

    // Si la carta era una Carta de Campo, recalcular estadísticas de todos los monstruos en el campo
    const isField = (cardData.race === 'Field' || (cardData.type && cardData.type.includes('Field')));
    if (isField) {
        recalculateAllFieldMonstersStats(duelState);
    }
}

function sendCardToBanished(duelState, card, controllerKey = 'player1') {
    if (!card) return;
    if (typeof card === 'string' && typeof controllerKey === 'object') {
        const tmp = card;
        card = controllerKey;
        controllerKey = tmp;
    }
    if (!card) return;
    const cardData = card.card_data || card;
    const targetOwner = card.originalOwner || cardData.originalOwner || controllerKey;
    const ownerObj = duelState[targetOwner] || duelState[controllerKey];
    if (ownerObj && ownerObj.banished) {
        ownerObj.banished.push(cardData);
    }

    // Limpiar equipos y efectos continuos asociados
    cleanAttachedEquipsAndContinuousEffects(duelState, card, controllerKey);

    const isField = (cardData.race === 'Field' || (cardData.type && cardData.type.includes('Field')));
    if (isField) {
        recalculateAllFieldMonstersStats(duelState);
    }
}

/**
 * MOTOR DE CÁLCULO DE ESTADÍSTICAS DINÁMICAS (MAGIAS DE CAMPO Y BONIFICACIONES)
 */
function calculateMonsterCurrentStats(arg1, arg2, arg3) {
    let monster = arg1;
    let duelState = arg2;

    // Soporte polimórfico si se llama como (duelState, monster, playerKey) o (monster, duelState)
    if (arg1 && arg1.player1 && arg1.player2) {
        duelState = arg1;
        monster = arg2;
    }

    if (!monster || !duelState) return null;
    const cardData = monster.card_data || monster;
    if (!cardData) return null;

    let baseAtk = cardData.atk !== null && cardData.atk !== undefined ? parseInt(cardData.atk, 10) : null;
    let baseDef = cardData.def !== null && cardData.def !== undefined ? parseInt(cardData.def, 10) : null;

    if (baseAtk === null || isNaN(baseAtk)) return null;
    if (baseAtk < 0) baseAtk = 0;
    if (baseDef !== null && baseDef < 0) baseDef = 0;

    let atkMod = Number(monster.permanentAtkMod || 0);
    let defMod = Number(monster.permanentDefMod || 0);

    // Determinar controlador y oponente
    let controllerObj = null;
    let opponentObj = null;
    let controllerKey = 'player1';
    if (arg3 && duelState[arg3]) {
        controllerObj = duelState[arg3];
        controllerKey = arg3;
        opponentObj = arg3 === 'player1' ? duelState.player2 : duelState.player1;
    } else if (duelState.player1 && duelState.player1.monsters && duelState.player1.monsters.includes(monster)) {
        controllerObj = duelState.player1;
        controllerKey = 'player1';
        opponentObj = duelState.player2;
    } else if (duelState.player2 && duelState.player2.monsters && duelState.player2.monsters.includes(monster)) {
        controllerObj = duelState.player2;
        controllerKey = 'player2';
        opponentObj = duelState.player1;
    }

    // REGLA OFICIAL OCG: Modificadores de Cartas de Equipo (Equip Spells)
    if (monster.attachedEffects && Array.isArray(monster.attachedEffects)) {
        monster.attachedEffects.forEach(eff => {
            const effName = (eff.card_name || (eff.card_data ? eff.card_data.name : '')).toLowerCase();
            if (effName.includes('united we stand') && controllerObj && controllerObj.monsters) {
                const faceupCount = controllerObj.monsters.filter(m => m && !m.faceDown).length;
                const dynamicBoost = faceupCount * 800;
                eff.atkDelta = dynamicBoost;
                eff.defDelta = dynamicBoost;
                atkMod += dynamicBoost;
                defMod += dynamicBoost;
            } else if (eff.effect_type === 'EQUIP') {
                atkMod += (eff.atkDelta || 0);
                defMod += (eff.defDelta || 0);
            }
        });
    }

    // Cartas de Campo reglamentarias OCG
    const activeFieldObjects = [];
    if (duelState.player1 && duelState.player1.fieldSpell) activeFieldObjects.push(duelState.player1.fieldSpell);
    if (duelState.player2 && duelState.player2.fieldSpell) activeFieldObjects.push(duelState.player2.fieldSpell);

    if (activeFieldObjects.length > 0) {
        const monAttr = ((cardData.attribute || '')).toUpperCase();
        const monRace = ((cardData.race || '')).toUpperCase();
        activeFieldObjects.forEach(fs => {
            const fsId = Number(fs.card_id || fs.id || (fs.card_data && fs.card_data.id) || 0);
            const { getCardEffect } = require('./card-registry');
            const fsMod = getCardEffect(fsId);
            if (fsMod && typeof fsMod.calculateFieldBonus === 'function') {
                const bonus = fsMod.calculateFieldBonus(monster, duelState, controllerKey);
                if (bonus) {
                    if (bonus.atk) atkMod += bonus.atk;
                    if (bonus.def) defMod += bonus.def;
                }
            } else if ((fs.name || (fs.card_data ? fs.card_data.name : '')).toLowerCase().includes('temple of the six') && fs.bushidoCounters) {
                const fsControllerKey = duelState.player1 && duelState.player1.fieldSpell === fs ? 'player1' : 'player2';
                const isOpponentOfField = (controllerObj === duelState[fsControllerKey === 'player1' ? 'player2' : 'player1']);
                if (isOpponentOfField) {
                    const reduction = Number(fs.bushidoCounters) * 100;
                    atkMod -= reduction;
                    defMod -= reduction;
                }
            }
        });
    }

    const cardName = (cardData.name || (monster.card_data ? monster.card_data.name : '')).toLowerCase();

    // Buster Blader: Gana 500 ATK por cada monstruo Dragón en el campo del oponente o en su Cementerio
    if (cardName.includes('buster blader') && opponentObj) {
        let dragonCount = 0;
        if (opponentObj.monsters) {
            opponentObj.monsters.forEach(m => {
                if (m && m.card_data && (m.card_data.race || '').toLowerCase().includes('dragon')) dragonCount++;
            });
        }
        if (opponentObj.graveyard) {
            opponentObj.graveyard.forEach(c => {
                if (c && (c.race || (c.card_data && c.card_data.race) || '').toLowerCase().includes('dragon')) dragonCount++;
            });
        }
        atkMod += dragonCount * 500;
    }

    // Boosters continuos de Atributo por Monstruo en Campo
    const allFaceupMonsters = [
        ...((duelState.player1 && duelState.player1.monsters) || []),
        ...((duelState.player2 && duelState.player2.monsters) || [])
    ].filter(m => m && !m.faceDown);

    const monsterAttr = ((cardData.attribute || (monster.card_data && monster.card_data.attribute)) || '').toString().toUpperCase();
    allFaceupMonsters.forEach(fm => {
        const fName = (fm.card_data?.name || fm.name || '').toLowerCase();
        if (fName.includes('star boy')) {
            if (monsterAttr === 'WATER') atkMod += 500;
            if (monsterAttr === 'FIRE') atkMod -= 400;
        } else if (fName.includes('milus radiant')) {
            if (monsterAttr === 'EARTH') atkMod += 500;
            if (monsterAttr === 'WIND') atkMod -= 400;
        } else if (fName.includes('little chimera')) {
            if (monsterAttr === 'FIRE') atkMod += 500;
            if (monsterAttr === 'WATER') atkMod -= 400;
        } else if (fName.includes('bladefly')) {
            if (monsterAttr === 'WIND') atkMod += 500;
            if (monsterAttr === 'EARTH') atkMod -= 400;
        } else if (fName.includes("witch's apprentice")) {
            if (monsterAttr === 'DARK') atkMod += 500;
            if (monsterAttr === 'LIGHT') atkMod -= 400;
        }
    });

    // Muka Muka: Gana 300 ATK y DEF por cada carta en la mano de su controlador
    if (cardName.includes('muka muka') && controllerObj && controllerObj.hand) {
        const handCount = controllerObj.hand.length;
        atkMod += handCount * 300;
        defMod += handCount * 300;
    }

    // Slifer the Sky Dragon: Gana 1000 ATK y DEF por cada carta en la mano
    if (cardName.includes('slifer') && controllerObj && controllerObj.hand) {
        const handCount = controllerObj.hand.length;
        baseAtk = 0;
        baseDef = 0;
        atkMod += handCount * 1000;
        defMod += handCount * 1000;
    }

    // The Winged Dragon of Ra: Transferencia de LP / Bono de invocación
    if (cardName.includes('winged dragon of ra') || cardName.includes('dragón alado de ra')) {
        baseAtk = 0;
        baseDef = 0;
        if (monster.raBonusAtk) atkMod += monster.raBonusAtk;
        if (monster.raBonusDef) defMod += monster.raBonusDef;
    }

    // Dragon Master Knight: Gana 500 ATK por cada Dragón en el campo y Cementerios
    if (cardName.includes('dragon master knight')) {
        let dragonCount = 0;
        const countDragonsInList = (list) => {
            (list || []).forEach(item => {
                if (!item) return;
                const iData = item.card_data || item;
                const r = (iData.race || '').toLowerCase();
                const t = (iData.type || '').toLowerCase();
                const n = (iData.name || '').toLowerCase();
                if ((r.includes('dragon') || t.includes('dragon') || n.includes('dragon')) && !n.includes('dragon master knight')) {
                    dragonCount++;
                }
            });
        };
        if (duelState.player1) {
            countDragonsInList(duelState.player1.monsters);
            countDragonsInList(duelState.player1.graveyard);
        }
        if (duelState.player2) {
            countDragonsInList(duelState.player2.monsters);
            countDragonsInList(duelState.player2.graveyard);
        }
        atkMod += dragonCount * 500;
    }

    // The Seal of Orichalcos: +500 ATK a todos los monstruos de su controlador
    if (controllerObj && (controllerObj.sealOfOrichalcosActive || (controllerObj.fieldSpell && (controllerObj.fieldSpell.name || '').toLowerCase().includes('orichalcos')))) {
        atkMod += 500;
    }

    // Legendary Six Samurai - Kageki: +1500 ATK mientras controles otro Six Samurai con diferente nombre
    if (cardName.includes('kageki') && controllerObj && controllerObj.monsters) {
        const hasOtherSS = controllerObj.monsters.some(m => {
            if (!m || m.faceDown) return false;
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return !mName.includes('kageki') && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });
        if (hasOtherSS) atkMod += 1500;
    }

    // Legendary Six Samurai - Kizan: +300 ATK/DEF mientras controles 2 o más otros Six Samurai
    if (cardName.includes('kizan') && controllerObj && controllerObj.monsters) {
        const otherSSCount = controllerObj.monsters.filter(m => {
            if (!m || m.faceDown) return false;
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return !mName.includes('kizan') && (mName.includes('six samurai') || mName.includes('seis samurai'));
        }).length;
        if (otherSSCount >= 2) {
            atkMod += 300;
            defMod += 300;
        }
    }

    // Exodia Necross: Bono continuo acumulado por Standby Phase
    if (cardName.includes('necross') && monster.necrossBonusAtk) {
        atkMod += monster.necrossBonusAtk;
    }

    // Lava Battleguard & Swamp Battleguard
    if (cardName.includes('lava battleguard') && controllerObj && controllerObj.monsters) {
        const swampCount = controllerObj.monsters.filter(m => m && !m.faceDown && (m.card_data?.name || m.name || '').toLowerCase().includes('swamp battleguard')).length;
        atkMod += swampCount * 500;
    }
    if (cardName.includes('swamp battleguard') && controllerObj && controllerObj.monsters) {
        const lavaCount = controllerObj.monsters.filter(m => m && !m.faceDown && (m.card_data?.name || m.name || '').toLowerCase().includes('lava battleguard')).length;
        atkMod += lavaCount * 500;
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
        if (p) {
            if (p.extraDeck) p.extraDeckCount = p.extraDeck.length;
            if (p.deck) p.mainDeckCount = p.deck.length;
            if (p.monsters) {
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
        }
    });
}

// emitDuelLog hoisted


/**
 * ============================================================================
 * PROCESAMIENTO CENTRAL DE FIN DE DUELO (RECOMPENSAS, SUERTE, DROPS Y BD)
 * ============================================================================
 */
let onDuelFinishedCallback = null;
function setOnDuelFinished(cb) {
    onDuelFinishedCallback = cb;
}

function isNpcPlayer(player, duelState, roomId) {
    if (!player) return false;
    if (player.isNpc || player.npcId) return true;
    if (duelState && (duelState.isNpcDuel || duelState.mode === 'NPC')) {
        if (player === duelState.player2 || player.username === duelState.player2?.username) return true;
    }
    if (roomId && (roomId.startsWith('NPC_') || roomId.includes('_NPC_') || roomId.includes('ADVENTURE_') || roomId.includes('SOLO_') || roomId.startsWith('ROOM_DEMO'))) {
        if (player === duelState?.player2 || player.username === duelState?.player2?.username) return true;
    }
    const name = (player.username || '').toLowerCase();
    return name.includes('npc') || name.includes('nv.') || name.includes('level') || 
           name.includes('yugi') || name.includes('kaiba') || name.includes('joey') || 
           name.includes('keith') || name.includes('mako') || name.includes('mai') || 
           name.includes('bakura') || name.includes('pegasus') || name.includes('marik') || 
           name.includes('muto') || name.includes('wheeler') || name.includes('weevil') || 
           name.includes('rex') || name.includes('tea') || name.includes('tristan') || 
           name.includes('ishizu') || name.includes('odion');
}

async function processDuelGameOver(roomId, duelState, winnerKey, loserKey, reason) {
    if (!duelState || duelState.isGameOver) return true;
    duelState.isGameOver = true;

    const winner = (winnerKey === 'player1' ? duelState.player1 : (winnerKey === 'player2' ? duelState.player2 : null)) || { username: winnerKey || 'Ganador' };
    const loser = (loserKey === 'player1' ? duelState.player1 : (loserKey === 'player2' ? duelState.player2 : null)) || { username: loserKey || 'Rival' };

    duelState.winner = winner.username;
    duelState.loser = loser.username;
    duelState.gameOverReason = reason || 'LP_ZERO';

    if (winnerKey === 'EMPATE' || !winnerKey) {
        duelState.winner = 'EMPATE';
        duelState.loser = null;
        duelState.gameOverReason = reason || 'TIE';
        duelState.rewards = null;
        emitDuelLog(roomId, `⚔️💥 ¡EMPATE! Los LP de ambos duelistas llegaron a 0 simultáneamente.`, 'game_over');

        // Registrar empate en SQL Server para el jugador
        try {
            const pool = await getPool();
            const p1 = duelState.player1;
            const p2 = duelState.player2;
            const isP2Npc = isNpcPlayer(p2, duelState, roomId);
            const isP1Npc = isNpcPlayer(p1, duelState, roomId);
            const isTiePvP = !isP1Npc && !isP2Npc;
            const tieNpcId = isP2Npc ? (p2.npcId || (p2.npc_id ? parseInt(p2.npc_id, 10) : 1)) : null;

            if (!isP1Npc && p1 && p1.username) {
                const uRes = await pool.request().input('uName', sql.VarChar(50), p1.username).query('SELECT Id, Nivel FROM dbo.Usuarios WHERE Username = @uName');
                if (uRes.recordset.length > 0) {
                    await pool.request()
                        .input('UsuarioId', sql.Int, uRes.recordset[0].Id)
                        .input('Username', sql.NVarChar(50), p1.username)
                        .input('RivalId', sql.Int, null)
                        .input('RivalNombre', sql.NVarChar(100), p2 ? p2.username : 'Rival')
                        .input('NpcId', sql.Int, !isTiePvP ? tieNpcId : null)
                        .input('EsPvp', sql.Bit, isTiePvP ? 1 : 0)
                        .input('EsVictoria', sql.Bit, 0)
                        .input('ExpGanada', sql.Int, 0)
                        .input('ExpPerdida', sql.Int, 0)
                        .input('StarshipsGanadas', sql.BigInt, 0)
                        .input('StarshipsPerdidas', sql.BigInt, 0)
                        .input('CardDropCode', sql.Int, null)
                        .input('CardDropNombre', sql.NVarChar(150), null)
                        .input('NivelJugador', sql.Int, uRes.recordset[0].Nivel || 1)
                        .input('NivelRival', sql.Int, p2 ? (p2.level || 1) : 1)
                        .input('Turnos', sql.Int, duelState.turnNumber || 1)
                        .input('MotivoFin', sql.NVarChar(50), 'TIE')
                        .execute('dbo.sp_RegistrarResultadoDuelo');
                }
            }
        } catch (tieErr) {
            console.error('[TIE DB RECORD ERROR]', tieErr.message);
        }

        if (getIo()) {
            getIo().to(roomId).emit('DUEL_GAME_OVER', {
                winner: 'EMPATE',
                loser: null,
                reason: reason || 'TIE',
                rewards: null
            });
        }
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        duelRooms.delete(roomId);
        if (onDuelFinishedCallback) {
            try { onDuelFinishedCallback(roomId); } catch(e) {}
        }
        return true;
    }

    const isWinnerNpc = isNpcPlayer(winner, duelState, roomId);
    const isLoserNpc = isNpcPlayer(loser, duelState, roomId);
    const isPvP = !isWinnerNpc && !isLoserNpc;

    // Extraer nivel del rival
    let rivalLevel = 1;
    if (isLoserNpc) {
        const match = loser.username.match(/nv\.?\s*(\d+)/i) || loser.username.match(/level\s*(\d+)/i);
        if (match) rivalLevel = parseInt(match[1], 10) || 1;
    } else {
        rivalLevel = loser.level || 1;
    }

    // Extraer ID del NPC si aplica
    let npcId = null;
    if (isLoserNpc) {
        npcId = loser.npcId || duelState.player2?.npcId || (duelState.player2?.npc_id ? parseInt(duelState.player2.npc_id, 10) : null);
    } else if (isWinnerNpc) {
        npcId = winner.npcId || duelState.player2?.npcId || (duelState.player2?.npc_id ? parseInt(duelState.player2.npc_id, 10) : null);
    }
    if (!npcId && !isPvP) {
        try {
            const pool = await getPool();
            const targetName = (isLoserNpc ? loser.username : winner.username) || '';
            const cleanName = targetName.split('(')[0].trim();
            const npcRes = await pool.request()
                .input('name', sql.NVarChar(100), `%${cleanName}%`)
                .query(`SELECT TOP 1 Id FROM dbo.NPCs WHERE Name LIKE @name`);
            if (npcRes.recordset.length > 0) npcId = npcRes.recordset[0].Id;
        } catch (e) {}
        if (!npcId) npcId = 1;
    }

    let rewardsData = null;

    if (!isWinnerNpc) {
        try {
            const pool = await getPool();
            const userRes = await pool.request()
                .input('Username', sql.VarChar(50), winner.username)
                .query(`
                    SELECT u.Id, u.Username, u.Nivel, u.Experiencia, u.Starships, u.VipUntil, u.AvatarActivoId,
                           s.BonusExp, s.BonusStarships, s.BonusSuerte
                    FROM dbo.Usuarios u
                    LEFT JOIN dbo.AvatarStats s ON u.Id = s.UsuarioId
                    WHERE u.Username = @Username
                `);

            if (userRes.recordset.length > 0) {
                const dbUser = userRes.recordset[0];
                const playerLevel = dbUser.Nivel || 1;
                const currentExp = dbUser.Experiencia || 0;

                const isVip = dbUser.VipUntil && new Date(dbUser.VipUntil) > new Date();
                const vipExpPct = isVip ? 25 : 0;
                const vipStarshipsPct = isVip ? 25 : 0;
                const vipLuckPct = isVip ? 20 : 0;

                // REGLA ESTRICTA: La bonificación de avatar corresponde única y exclusivamente a la instancia del Avatar Activo del Jugador en dbo.UserAvatars
                let avatarExpPct = 0.0;
                let avatarStarshipsPct = 0.0;
                let avatarLuckPct = 0.0;

                try {
                    const activeCode = (dbUser.AvatarActivoId || 'AVA-002').toUpperCase().trim();
                    const avRes = await pool.request()
                        .input('uid', sql.Int, dbUser.Id)
                        .input('code', sql.VarChar(50), activeCode)
                        .query(`
                            SELECT ExpBoost, StarshipsBoost, LuckBoost 
                            FROM dbo.UserAvatars 
                            WHERE UserId = @uid AND AvatarCode = @code
                        `);

                    if (avRes.recordset.length > 0) {
                        avatarExpPct = parseFloat(avRes.recordset[0].ExpBoost || 0);
                        avatarStarshipsPct = parseFloat(avRes.recordset[0].StarshipsBoost || 0);
                        avatarLuckPct = parseFloat(avRes.recordset[0].LuckBoost || 0);
                    }
                } catch (avErr) {
                    console.warn('[DUEL USER AVATAR BOOST WARNING]', avErr.message);
                }

                // Consultar Clan y Bonificación de Clan (1% a 100% de EXP y StarShips según Nivel de Clan)
                let clanId = null;
                let clanExpPct = 0;
                let clanStarshipsPct = 0;
                try {
                    const clanRes = await pool.request()
                        .input('uid', sql.Int, dbUser.Id)
                        .query(`
                            SELECT cm.ClanId, c.Level as ClanLevel
                            FROM dbo.ClanMembers cm
                            JOIN dbo.Clans c ON cm.ClanId = c.Id
                            WHERE cm.UserId = @uid AND c.IsActive = 1
                        `);
                    if (clanRes.recordset.length > 0) {
                        clanId = clanRes.recordset[0].ClanId;
                        const cLvl = clanRes.recordset[0].ClanLevel || 1;
                        clanExpPct = cLvl;
                        clanStarshipsPct = cLvl;
                    }
                } catch (cErr) {}

                // Consultar Medallas desbloqueadas del usuario directamente desde SQL Server
                let medalsExpPct = 0;
                let medalsStarshipsPct = 0;
                let medalsLuckPct = 0;
                try {
                    const medRes = await pool.request()
                        .input('UserId', sql.Int, dbUser.Id)
                        .execute('dbo.sp_ObtenerMedallasUsuario');
                    
                    const mRow = medRes.recordsets[0] && medRes.recordsets[0][0];
                    if (mRow) {
                        medalsExpPct = Math.round(Number(mRow.TotalExpBonus) * 100) / 100;
                        medalsStarshipsPct = Math.round(Number(mRow.TotalStarshipsBonus) * 100) / 100;
                        medalsLuckPct = Math.round(Number(mRow.TotalLuckBonus) * 1000) / 1000;
                    }
                } catch (mErr) {
                    console.warn('[MEDALS CALC WARNING]', mErr.message);
                }

                // Determinar sobre asignado para el drop según el NPC
                let assignedPackId = 'LOB';
                if (npcId) {
                    try {
                        const packRes = await pool.request()
                            .input('nid', sql.Int, npcId)
                            .query(`SELECT PackId FROM dbo.PackNpcAssignments WHERE NpcId = @nid`);
                        if (packRes.recordset.length > 0) {
                            assignedPackId = packRes.recordset[0].PackId;
                        }
                    } catch (pkErr) {}
                }

                let roomBonusExp = 0;
                let roomBonusStar = 0;
                let roomBonusTitle = '';
                if (isPvP) {
                    try {
                        const activePvPBonus = pvpBonusService.getActiveBonusSync();
                        if (activePvPBonus && activePvPBonus.isActive) {
                            roomBonusExp = activePvPBonus.expBonusPct || 0;
                            roomBonusStar = activePvPBonus.starshipsBonusPct || 0;
                            roomBonusTitle = activePvPBonus.title || 'Bonus Sala PvP';
                        }
                    } catch (bErr) {}
                }

                const isInstaSurrender = isPvP && reason === 'SURRENDER' && (duelState.turnNumber <= 2);
                if (isInstaSurrender) {
                    emitDuelLog(roomId, `⚠️ Rendición inmediata detectada (Turno ${duelState.turnNumber}). Recompensas reducidas para prevenir intercambios deshonestos.`, 'system');
                }

                // 1. Calcular recompensas con desglose aditivo Base + Avatar + VIP + Medallas + Clan + Bonus de Sala
                const calculatedRewards = progressionService.calculateDuelRewards({
                    playerLevel,
                    rivalLevel,
                    isPvP,
                    isInstaSurrender,
                    avatarExpBonusPct: avatarExpPct,
                    avatarStarshipsBonusPct: avatarStarshipsPct,
                    avatarLuckBonusPct: avatarLuckPct,
                    vipExpBonusPct: vipExpPct,
                    vipStarshipsBonusPct: vipStarshipsPct,
                    vipLuckBonusPct: vipLuckPct,
                    medalsExpBonusPct: medalsExpPct,
                    medalsStarshipsBonusPct: medalsStarshipsPct,
                    medalsLuckBonusPct: medalsLuckPct,
                    clanExpBonusPct: clanExpPct,
                    clanStarshipsBonusPct: clanStarshipsPct,
                    roomBonusExpPct: roomBonusExp,
                    roomBonusStarshipsPct: roomBonusStar,
                    roomBonusTitle: roomBonusTitle
                });

                // Si pertenece a un clan, sumar EXP de duelo al clan
                if (clanId) {
                    try {
                        const { addClanDuelExp } = require('../controllers/clans.controller');
                        if (typeof addClanDuelExp === 'function') {
                            await addClanDuelExp(clanId, dbUser.Id, calculatedRewards.exp.total, isPvP);
                        }
                    } catch (clErr) {}
                }

                // 2. Calcular subida de nivel
                const progressResult = progressionService.applyExpProgress(playerLevel, currentExp, calculatedRewards.exp.total);

                // 3. Calcular drop de carta basado en Suerte (0 a 100%) y sobre asignado al NPC con Pity Protection
                const cardDrop = progressionService.rollCardDrop({
                    userId: dbUser.Id,
                    username: dbUser.Username,
                    luckPct: calculatedRewards.luck.totalLuckPct,
                    isPvP,
                    playerLevel,
                    packId: assignedPackId
                });

                // 4. Drop de ficha de rompecabezas
                let puzzleDrop = null;
                try {
                    const dropRes = await puzzleService.awardDuelDrop(dbUser.Id, dbUser.Username, isPvP);
                    if (dropRes && dropRes.active) {
                        puzzleDrop = dropRes;
                        if (dropRes.dropped) {
                            emitDuelLog(roomId, `🧩 [EVENTO] ¡${dbUser.Username} ha obtenido la Ficha #${puzzleDrop.piece_number} del Rompecabezas! (${puzzleDrop.current_pieces_count}/${puzzleDrop.total_pieces})`, 'reward');
                            if (getIo()) getIo().to(roomId).emit('EVENT_PUZZLE_PIECE_AWARDED', puzzleDrop);
                        }
                    }
                } catch (pErr) {
                    console.warn('[PUZZLE DROP ERROR]', pErr.message);
                }

                // 4.5. Modo Aventura: Registrar récord de NPC, desbloquear medalla y siguiente NPC
                let adventureUnlockedMedal = null;
                let isNewNpcUnlocked = false;
                let nextNpcId = npcId;

                if (!isPvP && npcId) {
                    try {
                        const spRes = await pool.request()
                            .input('UserId', sql.Int, dbUser.Id)
                            .input('NpcId', sql.Int, npcId)
                            .input('Turns', sql.Int, duelState.turnNumber || 10)
                            .input('IsWinner', sql.Bit, 1)
                            .execute('dbo.sp_RegistrarVictoriaNpc');

                        const vicRow = spRes.recordset && spRes.recordset[0];
                        if (vicRow) {
                            if (vicRow.MedalUnlocked && vicRow.UnlockedMedalCode) {
                                adventureUnlockedMedal = {
                                    id: vicRow.UnlockedMedalCode,
                                    name: vicRow.UnlockedMedalName || 'Medalla Conquistada',
                                    desc: vicRow.UnlockedMedalDesc || vicRow.MedalDescription || '¡Has derrotado con honores a este duelista legendario!',
                                    npcId: npcId
                                };
                                emitDuelLog(roomId, `🎖️ [MEDALLA DESBLOQUEADA] ¡${winner.username} obtuvo la Medalla: ${vicRow.UnlockedMedalName}!`, 'reward');
                            }
                            if (vicRow.IsNewNpcUnlocked) {
                                isNewNpcUnlocked = true;
                                nextNpcId = vicRow.MaxNpcUnlocked;
                                emitDuelLog(roomId, `🔓 [AVENTURA] ¡Nuevo NPC desbloqueado en la campaña!`, 'reward');
                            }
                        }
                    } catch (advErr) {
                        console.warn('[ADVENTURE PROGRESS ERROR]', advErr.message);
                    }
                }

                // 5. Persistir nuevo nivel, EXP y StarShips en dbo.Usuarios
                let starshipsDeducted = 0;
                let expDeducted = 0;

                if (isPvP && loser.username && !isLoserNpc) {
                    starshipsDeducted = calculatedRewards.starships.base;
                    expDeducted = calculatedRewards.exp.base;
                }

                try {
                    // Actualizar balances del ganador
                    await pool.request()
                        .input('uid', sql.Int, dbUser.Id)
                        .input('lvl', sql.Int, progressResult.newLevel)
                        .input('exp', sql.Int, progressResult.newExp)
                        .input('stars', sql.BigInt, calculatedRewards.starships.total || 0)
                        .query(`
                            UPDATE dbo.Usuarios 
                            SET Nivel = @lvl, 
                                Experiencia = @exp, 
                                Starships = ISNULL(Starships, 0) + @stars 
                            WHERE Id = @uid
                        `);

                    // Si hubo drop de carta, registrar en inventario dbo.UserCardsSql
                    if (cardDrop && cardDrop.id) {
                        try {
                            await pool.request()
                                .input('uid', sql.Int, dbUser.Id)
                                .input('code', sql.Int, cardDrop.id)
                                .query(`
                                    IF EXISTS (SELECT 1 FROM dbo.UserCardsSql WHERE UsuarioId = @uid AND CardCode = @code)
                                        UPDATE dbo.UserCardsSql SET Quantity = Quantity + 1 WHERE UsuarioId = @uid AND CardCode = @code
                                    ELSE
                                        INSERT INTO dbo.UserCardsSql (UsuarioId, CardCode, Quantity, FoilType, AcquiredAt)
                                        VALUES (@uid, @code, 1, 'NORMAL', GETDATE())
                                `);
                        } catch (cSqlErr) {
                            console.warn('[CARD DROP INVENTORY INSERT ERROR]', cSqlErr.message);
                        }
                    }

                    // Finalizar y sellar el archivo de Text Log del duelo completo para auditoría
                    let logFilePath = null;
                    try {
                        logFilePath = duelLogger.finalizeDuelLog(roomId, winner.username, reason, {
                            p1Lp: duelState.player1 ? duelState.player1.lp : 0,
                            p2Lp: duelState.player2 ? duelState.player2.lp : 0,
                            turnsPlayed: duelState.turnNumber || 1,
                            p1Starships: calculatedRewards ? calculatedRewards.starships.total : 0,
                            p1Exp: calculatedRewards ? calculatedRewards.exp.total : 0
                        });
                    } catch (e) {}

                    // Registrar en Historial de Duelos y récords de NPC (dbo.sp_RegistrarResultadoDuelo)
                    await pool.request()
                        .input('UsuarioId', sql.Int, dbUser.Id)
                        .input('Username', sql.NVarChar(50), dbUser.Username)
                        .input('RivalId', sql.Int, isPvP ? (loser.id || null) : null)
                        .input('RivalNombre', sql.NVarChar(100), loser.username || (isPvP ? 'Rival' : 'NPC'))
                        .input('NpcId', sql.Int, !isPvP ? npcId : null)
                        .input('EsPvp', sql.Bit, isPvP ? 1 : 0)
                        .input('EsVictoria', sql.Bit, 1)
                        .input('ExpGanada', sql.Int, calculatedRewards.exp.total || 0)
                        .input('ExpPerdida', sql.Int, 0)
                        .input('StarshipsGanadas', sql.BigInt, calculatedRewards.starships.total || 0)
                        .input('StarshipsPerdidas', sql.BigInt, 0)
                        .input('CardDropCode', sql.Int, cardDrop ? cardDrop.id : null)
                        .input('CardDropNombre', sql.NVarChar(150), cardDrop ? cardDrop.name : null)
                        .input('NivelJugador', sql.Int, playerLevel)
                        .input('NivelRival', sql.Int, rivalLevel)
                        .input('Turnos', sql.Int, duelState.turnNumber || 1)
                        .input('MotivoFin', sql.NVarChar(50), reason || 'LP_ZERO')
                        .input('LogFilePath', sql.NVarChar(255), logFilePath)
                        .execute('dbo.sp_RegistrarResultadoDuelo');

                    // Si es PvP, actualizar y registrar también al perdedor humano
                    if (isPvP && loser.username) {
                        const loserDbRes = await pool.request()
                            .input('loserName', sql.VarChar(50), loser.username)
                            .query('SELECT Id, Nivel FROM dbo.Usuarios WHERE Username = @loserName');
                        
                        if (loserDbRes.recordset.length > 0) {
                            const loserId = loserDbRes.recordset[0].Id;
                            const loserLvl = loserDbRes.recordset[0].Nivel || 1;

                            if (starshipsDeducted > 0 || expDeducted > 0) {
                                await pool.request()
                                    .input('lId', sql.Int, loserId)
                                    .input('sDed', sql.BigInt, starshipsDeducted)
                                    .input('eDed', sql.Int, expDeducted)
                                    .query(`
                                        UPDATE dbo.Usuarios 
                                        SET Starships = CASE WHEN Starships >= @sDed THEN Starships - @sDed ELSE 0 END,
                                            Experiencia = CASE WHEN Experiencia >= @eDed THEN Experiencia - @eDed ELSE 0 END
                                        WHERE Id = @lId
                                    `);
                            }

                            await pool.request()
                                .input('UsuarioId', sql.Int, loserId)
                                .input('Username', sql.NVarChar(50), loser.username)
                                .input('RivalId', sql.Int, dbUser.Id)
                                .input('RivalNombre', sql.NVarChar(100), dbUser.Username)
                                .input('NpcId', sql.Int, null)
                                .input('EsPvp', sql.Bit, 1)
                                .input('EsVictoria', sql.Bit, 0)
                                .input('ExpGanada', sql.Int, 0)
                                .input('ExpPerdida', sql.Int, expDeducted)
                                .input('StarshipsGanadas', sql.BigInt, 0)
                                .input('StarshipsPerdidas', sql.BigInt, starshipsDeducted)
                                .input('CardDropCode', sql.Int, null)
                                .input('CardDropNombre', sql.NVarChar(150), null)
                                .input('NivelJugador', sql.Int, loserLvl)
                                .input('NivelRival', sql.Int, playerLevel)
                                .input('Turnos', sql.Int, duelState.turnNumber || 1)
                                .input('MotivoFin', sql.NVarChar(50), reason || 'LP_ZERO')
                                .input('LogFilePath', sql.NVarChar(255), logFilePath)
                                .execute('dbo.sp_RegistrarResultadoDuelo');
                        }

                        if (starshipsDeducted > 0) {
                            emitDuelLog(roomId, `📉 [PENALIZACIÓN DERROTA] ${loser.username} descontado -${starshipsDeducted.toLocaleString()} ★ y -${expDeducted.toLocaleString()} ⚡ de experiencia.`, 'system');
                        }
                    }
                } catch (duelSpErr) {
                    console.error('[SP_REGISTRAR_RESULTADO_DUELO WINNER ERROR]', duelSpErr.message);
                }

                rewardsData = {
                    isWinner: true,
                    expAwarded: calculatedRewards.exp.total,
                    starshipsAwarded: calculatedRewards.starships.total,
                    expBreakdown: calculatedRewards.exp,
                    starshipsBreakdown: calculatedRewards.starships,
                    luck: calculatedRewards.luck,
                    levelProgress: progressResult,
                    cardDrop: cardDrop,
                    puzzlePiece: puzzleDrop,
                    unlockedMedal: adventureUnlockedMedal,
                    isNewNpcUnlocked: isNewNpcUnlocked,
                    nextNpcId: nextNpcId
                };

                if (cardDrop) {
                    emitDuelLog(roomId, `🃏 [DROP DE CARTA] ¡${winner.username} obtuvo '${cardDrop.name}' (${cardDrop.rarity}) gracias a su Suerte (${calculatedRewards.luck.totalLuckPct}%)!`, 'reward');
                }

                if (progressResult.isLeveledUp) {
                    emitDuelLog(roomId, `🎉 ¡SUBIDA DE NIVEL! ¡${winner.username} ha alcanzado el Nivel ${progressResult.newLevel}!`, 'reward');
                }
            }
        } catch (dbErr) {
            console.error('[DUEL GAME OVER DB ERROR]', dbErr);
        }
    } else if (isWinnerNpc && !isLoserNpc) {
        // CASO: EL JUGADOR HUMANO PIERDE CONTRA EL NPC
        try {
            const pool = await getPool();
            const loserUserRes = await pool.request()
                .input('uName', sql.VarChar(50), loser.username)
                .query('SELECT Id, Username, Nivel FROM dbo.Usuarios WHERE Username = @uName');

            if (loserUserRes.recordset.length > 0) {
                const loserDb = loserUserRes.recordset[0];

                let npcLossLogPath = null;
                try {
                    npcLossLogPath = duelLogger.finalizeDuelLog(roomId, winner.username, reason, {
                        p1Lp: duelState.player1 ? duelState.player1.lp : 0,
                        p2Lp: duelState.player2 ? duelState.player2.lp : 0,
                        turnsPlayed: duelState.turnNumber || 1
                    });
                } catch (e) {}

                await pool.request()
                    .input('UsuarioId', sql.Int, loserDb.Id)
                    .input('Username', sql.NVarChar(50), loserDb.Username)
                    .input('RivalId', sql.Int, null)
                    .input('RivalNombre', sql.NVarChar(100), winner.username || 'NPC')
                    .input('NpcId', sql.Int, npcId || 1)
                    .input('EsPvp', sql.Bit, 0)
                    .input('EsVictoria', sql.Bit, 0)
                    .input('ExpGanada', sql.Int, 0)
                    .input('ExpPerdida', sql.Int, 0)
                    .input('StarshipsGanadas', sql.BigInt, 0)
                    .input('StarshipsPerdidas', sql.BigInt, 0)
                    .input('CardDropCode', sql.Int, null)
                    .input('CardDropNombre', sql.NVarChar(150), null)
                    .input('NivelJugador', sql.Int, loserDb.Nivel || 1)
                    .input('NivelRival', sql.Int, rivalLevel)
                    .input('Turnos', sql.Int, duelState.turnNumber || 1)
                    .input('MotivoFin', sql.NVarChar(50), reason || 'LP_ZERO')
                    .input('LogFilePath', sql.NVarChar(255), npcLossLogPath)
                    .execute('dbo.sp_RegistrarResultadoDuelo');

                emitDuelLog(roomId, `💀 [DERROTA CONTRA NPC] ${loserDb.Username} ha sido derrotado por ${winner.username} en el turno ${duelState.turnNumber || 1}.`, 'system');
            }
        } catch (npcLossErr) {
            console.error('[SP_REGISTRAR_RESULTADO_DUELO NPC LOSS ERROR]', npcLossErr);
        }
    }

    emitDuelLog(roomId, `🏆 ¡FIN DEL DUELO! Victoria para ${winner.username} (${reason}).`, 'game_over');

    duelState.isGameOver = true;
    duelState.winner = winner.username;
    duelState.loser = loser.username;
    duelState.gameOverReason = reason || 'LP_ZERO';
    duelState.rewards = rewardsData;

    if (getIo()) {
        getIo().to(roomId).emit('DUEL_GAME_OVER', {
            winner: winner.username,
            loser: loser.username,
            reason: reason,
            rewards: rewardsData
        });
    }

    enrichDuelStateForBroadcast(duelState);
    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
    duelRooms.delete(roomId);
    
    // Notificar al motor de torneos si era una partida oficial de torneo
    try {
        const { tournamentService } = require('./tournament-service');
        if (tournamentService && typeof tournamentService.onDuelEnded === 'function') {
            tournamentService.onDuelEnded(roomId, winner.username, loser.username);
        }
    } catch (tErr) {
        console.warn('[TOURNAMENT HOOK ERROR]', tErr.message);
    }

    if (onDuelFinishedCallback) {
        try { onDuelFinishedCallback(roomId); } catch(e) {}
    }
    return true;
}

// Comprobación canónica y modular de victoria por Exodia (Mano y/o Campo de Monstruos)
function checkExodiaWin(playerOrHand) {
    if (!playerOrHand) return false;
    let pool = [];
    if (Array.isArray(playerOrHand)) {
        pool = playerOrHand;
    } else {
        const hand = Array.isArray(playerOrHand.hand) ? playerOrHand.hand : [];
        const monsters = Array.isArray(playerOrHand.monsters) ? playerOrHand.monsters.filter(Boolean) : [];
        pool = [...hand, ...monsters];
    }
    if (pool.length < 5) return false;

    const { getCardEffect } = require('./card-registry');
    const exodiaMod = getCardEffect(33396948);
    if (exodiaMod && typeof exodiaMod.checkVictoryCondition === 'function') {
        return exodiaMod.checkVictoryCondition(pool);
    }
    return false;
}

/**
 * ============================================================================
 * CONDICIONES OFICIALES DE FIN DE DUELO OCG (EXODIA, LP A 0 Y DECK OUT)
 * ============================================================================
 */
function checkDuelGameOver(roomId, duelState) {
    if (!duelState || duelState.isGameOver) return true;

    const p1 = duelState.player1 || (duelState.players && duelState.players.player1);
    const p2 = duelState.player2 || (duelState.players && duelState.players.player2);
    if (!p1 || !p2) return false;

    // 1. CONDICIÓN ESPECIAL OFICIAL OCG: VICTORIA AUTOMÁTICA POR EXODIA (Mano y/o Campo)
    if (checkExodiaWin(p1)) {
        emitDuelLog(roomId, `✨ ¡¡¡EXODIA, EL PROHIBIDO HA SIDO REUNIDO POR ${p1.username || 'player1'}!!! Las 5 piezas sagradas han sido reunidas (Mano/Campo).`, 'victory');
        processDuelGameOver(roomId, duelState, 'player1', 'player2', 'EXODIA');
        return true;
    }

    if (checkExodiaWin(p2)) {
        emitDuelLog(roomId, `✨ ¡¡¡EXODIA, EL PROHIBIDO HA SIDO REUNIDO POR ${p2.username || 'player2'}!!! Las 5 piezas sagradas han sido reunidas (Mano/Campo).`, 'victory');
        processDuelGameOver(roomId, duelState, 'player2', 'player1', 'EXODIA');
        return true;
    }

    // 2. LP A CERO
    if (p1.lp <= 0 && p2.lp <= 0) {
        processDuelGameOver(roomId, duelState, 'EMPATE', null, 'TIE');
        return true;
    }

    if (p2.lp <= 0) {
        processDuelGameOver(roomId, duelState, 'player1', 'player2', 'LP_ZERO');
        return true;
    }

    if (p1.lp <= 0) {
        processDuelGameOver(roomId, duelState, 'player2', 'player1', 'LP_ZERO');
        return true;
    }

    return false;
}

function checkDeckOut(roomId, duelState, playerKey) {
    if (!duelState || duelState.isGameOver) return true;
    const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
    const player = duelState[playerKey];

    if (!player.deck || player.deck.length === 0) {
        emitDuelLog(roomId, `💀 ¡${player.username} no puede robar ninguna carta de su Deck! Derrota por Deck Out.`, 'victory');
        processDuelGameOver(roomId, duelState, opponentKey, playerKey, 'DECK_OUT');
        return true;
    }
    return false;
}

function checkTributesNeeded(level, cardId, cardData = null) {
    if (cardData && typeof cardData.requiresThreeTributes === 'number') return cardData.requiresThreeTributes;
    const name = (cardData?.name || '').toLowerCase();
    if (name.includes('obelisk') || name.includes('slifer') || name.includes('winged dragon of ra') || name.includes('gilford') || name.includes('barbaros') || name.includes('wicked avatar') || name.includes('wicked dreadroot') || name.includes('wicked eraser')) {
        return 3;
    }
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
    checkExodiaWin,
    checkDeckOut,
    checkTributesNeeded,
    processDuelGameOver,
    setOnDuelFinished,
    recalculateAllFieldMonstersStats,
    cleanAttachedEquipsAndContinuousEffects,
    cleanupOrphanedEquipCards,
    getRoomManifest,
    initializeRoomManifest
};
