/**
 * Ani-Dimension: Motor OCG de Cadenas LIFO y Efectos Oficiales de Cartas
 */
const {
    duelRooms,
    roomChainTimers,
    roomChainCallbacks,
    getIo,
    emitDuelLog,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver
} = require('./duel-state');

const { ocgLuaRunner } = require('../ocgcore/lua-runner');
const { ocgCardReader } = require('../data/sql-card-reader');

let executeNpcTurnRef = () => {};
function setNpcTurnExecutor(fn) {
    executeNpcTurnRef = fn;
}

function buildFieldCardsForLua(duelState, playerKey, opponentKey) {
    const cards = [];
    const p1 = duelState[playerKey];
    const p2 = duelState[opponentKey];

    const getRaceAttrType = (cardObj) => {
        const cd = cardObj.card_data || cardObj;
        const cId = cardObj.card_id || cd.id || cd.card_id || 0;
        let r = cd.raceCode;
        let a = cd.attributeCode;
        let t = cd.typeCode;
        if ((!r || !a) && cId) {
            const db = ocgCardReader(cId);
            if (db) {
                if (!r) r = db.raceCode;
                if (!a) a = db.attributeCode;
                if (!t) t = db.typeCode;
            }
        }
        return {
            id: cId,
            race: r || 0,
            attribute: a || 0,
            type: t || 0x11
        };
    };

    if (p1 && p1.monsters) {
        for (let i = 0; i < 5; i++) {
            const m = p1.monsters[i];
            if (m) {
                const meta = getRaceAttrType(m);
                const pos = m.faceDown ? 0x08 : (m.position === 'DEF' ? 0x04 : 0x01);
                cards.push({
                    id: meta.id,
                    owner: 0,
                    sequence: i,
                    location: 0x04,
                    position: pos,
                    race: meta.race,
                    attribute: meta.attribute,
                    type: meta.type,
                    attack: m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0),
                    defense: m.currentDef !== undefined ? m.currentDef : (m.card_data ? m.card_data.def : 0)
                });
            }
        }
    }

    if (p2 && p2.monsters) {
        for (let i = 0; i < 5; i++) {
            const m = p2.monsters[i];
            if (m) {
                const meta = getRaceAttrType(m);
                const pos = m.faceDown ? 0x08 : (m.position === 'DEF' ? 0x04 : 0x01);
                cards.push({
                    id: meta.id,
                    owner: 1,
                    sequence: i,
                    location: 0x04,
                    position: pos,
                    race: meta.race,
                    attribute: meta.attribute,
                    type: meta.type,
                    attack: m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0),
                    defense: m.currentDef !== undefined ? m.currentDef : (m.card_data ? m.card_data.def : 0)
                });
            }
        }
    }

    if (p1 && p1.spells) {
        for (let i = 0; i < 5; i++) {
            const s = p1.spells[i];
            if (s) {
                const meta = getRaceAttrType(s);
                cards.push({
                    id: meta.id,
                    owner: 0,
                    sequence: i,
                    location: 0x08,
                    position: s.faceDown ? 0x08 : 0x01,
                    race: 0,
                    attribute: 0,
                    type: meta.type || 0x02,
                    attack: 0,
                    defense: 0
                });
            }
        }
    }

    if (p2 && p2.spells) {
        for (let i = 0; i < 5; i++) {
            const s = p2.spells[i];
            if (s) {
                const meta = getRaceAttrType(s);
                cards.push({
                    id: meta.id,
                    owner: 1,
                    sequence: i,
                    location: 0x08,
                    position: s.faceDown ? 0x08 : 0x01,
                    race: 0,
                    attribute: 0,
                    type: meta.type || 0x02,
                    attack: 0,
                    defense: 0
                });
            }
        }
    }

    return cards;
}

async function executeCardEffect(roomId, cardData, playerKey, opponentKey, targetData = null, link = null) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    const player = duelState[playerKey];
    const opponent = duelState[opponentKey];
    const cardId = cardData.id || cardData.card_id;

    let targetPos = 'ATK';
    let targetCardId = 10000000;
    if (targetData && targetData.slot_index !== undefined) {
        const tPKey = targetData.target_player || opponentKey;
        const tPl = duelState[tPKey];
        if (tPl && tPl.monsters[targetData.slot_index]) {
            const m = tPl.monsters[targetData.slot_index];
            targetPos = m.position || 'ATK';
            targetCardId = m.card_id || (m.card_data ? m.card_data.id : 10000000);
        }
    }

    const allFieldCards = buildFieldCardsForLua(duelState, playerKey, opponentKey);

    // Contexto oficial conectado al estado de la sala de duelo y Lua Runner
    const context = {
        turnPlayerIndex: playerKey === 'player1' ? 0 : 1,
        targetPosition: targetPos,
        targetCardId: targetCardId,
        targetSlot: (targetData && targetData.slot_index !== undefined) ? targetData.slot_index : undefined,
        targetPlayer: (targetData && targetData.target_player) ? targetData.target_player : opponentKey,
        fieldCards: allFieldCards,

        onDraw: (playerIdx, count) => {
            const targetPlayer = playerIdx === 0 ? duelState.player1 : duelState.player2;
            let drawn = 0;
            for (let i = 0; i < count; i++) {
                if (targetPlayer.deck.length > 0) {
                    const card = targetPlayer.deck.pop();
                    targetPlayer.hand.push(card);
                    drawn++;
                }
            }
            targetPlayer.mainDeckCount = targetPlayer.deck.length;
            emitDuelLog(roomId, `✨ [Efecto Lua] ${targetPlayer.username} roba ${drawn} carta(s) de su Deck por efecto de "${cardData.name}".`, 'spell');
        },

        onRecover: (playerIdx, amount) => {
            const targetPlayer = playerIdx === 0 ? duelState.player1 : duelState.player2;
            targetPlayer.lp = (targetPlayer.lp || 8000) + amount;
            emitDuelLog(roomId, `💚 [Efecto Lua] ¡${targetPlayer.username} recupera ${amount} LP por efecto de "${cardData.name}"! (LP: ${targetPlayer.lp})`, 'spell');
        },

        onDamage: (playerIdx, amount) => {
            const targetPlayer = playerIdx === 0 ? duelState.player1 : duelState.player2;
            targetPlayer.lp = Math.max(0, targetPlayer.lp - amount);
            emitDuelLog(roomId, `💥 [Efecto Lua] ${targetPlayer.username} recibe ${amount} puntos de daño por efecto. (LP: ${targetPlayer.lp})`, 'battle');
            checkDuelGameOver(roomId, duelState);
        },

        onDestroy: (targetCardId, slotIdx, ownerIdx, location) => {
            // Si la propia carta se destruye a sí misma (como Spellbinding Circle cuando su objetivo se va)
            if (targetCardId > 0 && (targetCardId === cardId || (cardData.alias && cardData.alias > 0 && targetCardId === cardData.alias))) {
                return;
            }

            // Determinar a qué jugador pertenece la carta destruida según el motor Lua
            let tPlayerKey = opponentKey;
            if (ownerIdx !== undefined) {
                tPlayerKey = (ownerIdx === 0) ? playerKey : opponentKey;
            } else if (targetData && targetData.target_player) {
                tPlayerKey = targetData.target_player;
            }

            const tPlayer = duelState[tPlayerKey];
            if (!tPlayer) return;

            // 1. Destrucción en casilla específica indicada por Lua
            if (slotIdx !== undefined && slotIdx >= 0) {
                if (location === 0x08) {
                    // Magia / Trampa
                    if (tPlayer.spells[slotIdx]) {
                        const sCard = tPlayer.spells[slotIdx];
                        sendCardToGraveyard(duelState, sCard, tPlayerKey);
                        tPlayer.spells[slotIdx] = null;
                        emitDuelLog(roomId, `🌪️ [Efecto Lua] ¡"${cardData.name}" destruyó la carta Mágica/Trampa "${sCard.card_data ? sCard.card_data.name : 'Carta'}" en casilla #${slotIdx + 1}!`, 'spell');
                    }
                } else {
                    // Monstruo (default o 0x04)
                    if (tPlayer.monsters[slotIdx]) {
                        const targetMonster = tPlayer.monsters[slotIdx];
                        sendCardToGraveyard(duelState, targetMonster, tPlayerKey);
                        tPlayer.monsters[slotIdx] = null;
                        emitDuelLog(roomId, `⚡💥 [Efecto Lua] ¡"${cardData.name}" destruyó a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" en casilla #${slotIdx + 1}!`, 'spell');
                    }
                }
            } else if (targetCardId && targetCardId > 0 && targetCardId !== 10000000) {
                // 2. Destrucción por ID de carta encontrada en el campo del jugador
                const mIdx = tPlayer.monsters.findIndex(m => m && ((m.card_id === targetCardId) || (m.card_data && m.card_data.id === targetCardId)));
                if (mIdx !== -1) {
                    const targetMonster = tPlayer.monsters[mIdx];
                    sendCardToGraveyard(duelState, targetMonster, tPlayerKey);
                    tPlayer.monsters[mIdx] = null;
                    emitDuelLog(roomId, `⚡💥 [Efecto Lua] ¡"${cardData.name}" destruyó a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" en casilla #${mIdx + 1}!`, 'spell');
                }
            }

            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
                duelState.pendingAction.negated = true;
            }
        },

        onToHand: (targetCardId, slotIdx) => {
            let targetIdx = -1;
            let targetPKey = opponentKey;
            if (targetData && targetData.slot_index !== undefined) {
                targetPKey = targetData.target_player || opponentKey;
                targetIdx = targetData.slot_index;
            } else if (duelState.pendingAction && duelState.pendingAction.attackerSlot !== undefined) {
                targetIdx = duelState.pendingAction.attackerSlot;
            } else {
                targetIdx = opponent.monsters.findIndex(m => m !== null);
            }
            if (targetIdx !== -1) {
                const tPlayer = duelState[targetPKey];
                const bounced = tPlayer.monsters[targetIdx];
                if (bounced) {
                    tPlayer.monsters[targetIdx] = null;
                    tPlayer.hand.push(bounced.card_data || bounced);
                    emitDuelLog(roomId, `🔄 [Efecto Lua] ¡"${cardData.name}" devolvió a "${bounced.card_data ? bounced.card_data.name : 'Monstruo'}" a la mano de ${tPlayer.username}!`, 'spell');
                }
            }
        },

        onChangePos: (targetCardId, slotIdx, pos) => {
            let targetIdx = -1;
            let targetPKey = opponentKey;
            if (targetData && targetData.slot_index !== undefined) {
                targetPKey = targetData.target_player || opponentKey;
                targetIdx = targetData.slot_index;
            } else {
                targetIdx = opponent.monsters.findIndex(m => m !== null && m.position === 'DEF');
                if (targetIdx === -1) targetIdx = opponent.monsters.findIndex(m => m !== null);
            }
            if (targetIdx !== -1) {
                const tPlayer = duelState[targetPKey];
                const targetMonster = tPlayer.monsters[targetIdx];
                if (targetMonster) {
                    targetMonster.position = 'ATK';
                    targetMonster.faceDown = false;
                    emitDuelLog(roomId, `🔄 [Efecto Lua] ¡"${cardData.name}" forzó a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" a cambiar a Modo de Ataque!`, 'position');
                }
            }
        },

        onCoin: (playerIdx) => {
            const isHeads = Math.random() < 0.5;
            emitDuelLog(roomId, `🪙 [Efecto Lua] Lanzamiento de moneda: ¡${isHeads ? 'CARA (Acierto)' : 'CRUZ (Fallo)'}!`, 'spell');
            return isHeads;
        },

        onSpecialSummon: (targetCardId, targetPlayerIdx, pos) => {
            const targetPlayerKey = targetPlayerIdx === 0 ? 'player1' : 'player2';
            const oppPlayerKey = targetPlayerKey === 'player1' ? 'player2' : 'player1';
            const tPlayer = duelState[targetPlayerKey];
            const oPlayer = duelState[oppPlayerKey];
            
            let revived = null;
            let originalOwner = targetPlayerKey;
            
            if (targetData && targetData.card_id) {
                const gIdx = tPlayer.graveyard.findIndex(c => (c.id || c.card_id) === targetData.card_id);
                if (gIdx !== -1) {
                    revived = tPlayer.graveyard.splice(gIdx, 1)[0];
                    originalOwner = targetPlayerKey;
                } else {
                    const ogIdx = oPlayer.graveyard.findIndex(c => (c.id || c.card_id) === targetData.card_id);
                    if (ogIdx !== -1) {
                        revived = oPlayer.graveyard.splice(ogIdx, 1)[0];
                        originalOwner = oppPlayerKey;
                    }
                }
            }
            
            if (!revived) {
                if (tPlayer.graveyard.length > 0) {
                    revived = tPlayer.graveyard.pop();
                    originalOwner = targetPlayerKey;
                } else if (oPlayer.graveyard.length > 0) {
                    revived = oPlayer.graveyard.pop();
                    originalOwner = oppPlayerKey;
                }
            }

            if (revived) {
                const emptySlot = tPlayer.monsters.findIndex(m => m === null);
                if (emptySlot !== -1) {
                    tPlayer.monsters[emptySlot] = {
                        card_id: revived.id || revived.card_id,
                        position: 'ATK',
                        faceDown: false,
                        hasAttacked: false,
                        turnSummoned: duelState.turnNumber,
                        hasChangedPosition: false,
                        originalOwner: originalOwner,
                        card_data: revived.card_data || revived
                    };
                    calculateMonsterCurrentStats(tPlayer.monsters[emptySlot], duelState);
                    emitDuelLog(roomId, `✨⭐ [Invocación Especial Lua] ¡${tPlayer.username} revive a "${revived.name || (revived.card_data ? revived.card_data.name : 'Monstruo')}"!`, 'spell');
                }
            }
        },

        onNegateAttack: () => {
            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
                duelState.pendingAction.negated = true;
                emitDuelLog(roomId, `🛑 [Efecto Lua] ¡El ataque fue negado!`, 'trap');
            }
        }
    };

    // 1. Ejecutar el script oficial Lua c<id>.lua
    let luaExecuted = false;
    try {
        luaExecuted = await ocgLuaRunner.executeActivatedEffect(cardId, context);
    } catch (e) {
        console.warn(`[OCG LUA] Advertencia al ejecutar c${cardId}.lua:`, e.message);
    }

    // 2. Efectos continuos, de equipo o campo que requieren enlace en estado de juego
    const isField = cardData.race === 'Field' || (cardData.type && cardData.type.includes('Field'));
    const isEquip = cardData.race === 'Equip' || (cardData.type && cardData.type.includes('Equip'));
    const isContinuousTrap = (cardId === 18807109 || cardId === 18807108 || cardId === 44519536);

    if (isField) {
        player.fieldSpell = { card_id: cardId, card_data: cardData };
        emitDuelLog(roomId, `🌌 [Campo Mágico] ${player.username} activa el Campo "${cardData.name}".`, 'field');
    } else if (isEquip) {
        let targetIdx = -1;
        let targetPKey = playerKey;
        if (targetData && targetData.slot_index !== undefined) {
            targetPKey = targetData.target_player || playerKey;
            targetIdx = targetData.slot_index;
        } else {
            targetIdx = player.monsters.findIndex(m => m !== null && !m.faceDown);
        }

        const targetP = duelState[targetPKey];
        if (targetIdx !== -1 && targetP && targetP.monsters[targetIdx]) {
            const eqMonster = targetP.monsters[targetIdx];
            
            // Validar compatibilidad estricta según el script Lua oficial de la carta de equipo
            const equipCheck = ocgLuaRunner.checkCanEquip(cardId, eqMonster.card_data || eqMonster);
            if (!equipCheck.valid) {
                emitDuelLog(roomId, `⚠️ [Regla Oficial] "${cardData.name}" no es compatible con "${eqMonster.card_data ? eqMonster.card_data.name : 'Monstruo'}". Equipamiento rechazado por script Lua oficial.`, 'spell');
                return;
            }

            // Obtener modificadores exactos de ATK y DEF declarados en el script Lua oficial
            const { atkDelta, defDelta } = ocgLuaRunner.getEquipStatMods(cardId, eqMonster.card_data || eqMonster);

            if (!eqMonster.attachedEffects) eqMonster.attachedEffects = [];
            eqMonster.equipAtkMod = (eqMonster.equipAtkMod || 0) + atkDelta;
            eqMonster.equipDefMod = (eqMonster.equipDefMod || 0) + defDelta;
            eqMonster.attachedEffects.push({
                card_id: cardId,
                card_name: cardData.name,
                effect_type: 'EQUIP',
                atkDelta: atkDelta,
                defDelta: defDelta
            });
            calculateMonsterCurrentStats(eqMonster, duelState);
            const deltaStr = (atkDelta !== 0 || defDelta !== 0) 
                ? ` (${atkDelta >= 0 ? '+' : ''}${atkDelta} ATK / ${defDelta >= 0 ? '+' : ''}${defDelta} DEF)`
                : '';
            emitDuelLog(roomId, `🗡️ [Efecto Equipar Lua] "${cardData.name}" equipado a "${eqMonster.card_data ? eqMonster.card_data.name : 'Monstruo'}"${deltaStr}.`, 'spell');
        }
    } else if (isContinuousTrap) {
        let targetIdx = -1;
        if (targetData && targetData.slot_index !== undefined && opponent.monsters[targetData.slot_index]) {
            targetIdx = targetData.slot_index;
        } else if (duelState.pendingAction && duelState.pendingAction.attackerSlot !== undefined) {
            targetIdx = duelState.pendingAction.attackerSlot;
        } else {
            targetIdx = opponent.monsters.findIndex(m => m !== null && !m.isTrapped);
        }
        if (targetIdx !== -1) {
            const trappedMonster = opponent.monsters[targetIdx];
            trappedMonster.isTrapped = true;
            if (!trappedMonster.attachedEffects) trappedMonster.attachedEffects = [];
            trappedMonster.attachedEffects.push({
                card_id: cardId,
                card_name: cardData.name,
                effect_type: 'CANNOT_ATTACK',
                desc: 'No puede declarar ataque ni cambiar su posición de batalla.'
            });
            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK' && duelState.pendingAction.attackerSlot === targetIdx) {
                duelState.pendingAction.negated = true;
                emitDuelLog(roomId, `🛑 ¡Ataque cancelado! El monstruo atacante ha sido encadenado por "${cardData.name}".`, 'trap');
            }
            emitDuelLog(roomId, `⛓️ [Efecto Lua] ¡"${cardData.name}" inmovilizó a "${trappedMonster.card_data ? trappedMonster.card_data.name : 'Monstruo'}"!`, 'trap');
        }
    }

    if (!luaExecuted && !isField && !isEquip && !isContinuousTrap) {
        emitDuelLog(roomId, `✨ [Efecto OCG] ${player.username} activó "${cardData.name}".`, 'spell');
    }
}

/**
 * Resolución de Cadena Oficial LIFO (Last In, First Out)
 */
async function resolveActiveChain(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    if (duelState.activeChain && duelState.activeChain.length > 0) {
        console.log(`[OCG CHAIN] Iniciando Resolución de Cadena LIFO (${duelState.activeChain.length} eslabones)...`);
        emitDuelLog(roomId, `⛓️ === RESOLVIENDO CADENA (${duelState.activeChain.length} Eslabones) ===`, 'chain');

        // Procesar en orden inverso (LIFO)
        while (duelState.activeChain.length > 0) {
            const link = duelState.activeChain.pop();
            const playerKey = link.player === duelState.player1.username ? 'player1' : 'player2';
            const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';

            emitDuelLog(roomId, `⛓️ [Eslabón ${link.chainLink}] Resolviendo efecto de "${link.card_data.name}" (${link.player})...`, 'chain');
            
            // Ejecutar el efecto correspondiente en Lua
            await executeCardEffect(roomId, link.card_data, playerKey, opponentKey, link.target_data, link);

            const isField = link.card_data.race === 'Field' || (link.card_data.type && link.card_data.type.includes('Field'));
            const isContinuous = link.card_data.race === 'Continuous' || (link.card_data.type && link.card_data.type.includes('Continuous')) || link.card_id === 18807109 || link.card_id === 18807108 || link.card_id === 44519536;
            const isEquip = link.card_data.race === 'Equip' || (link.card_data.type && link.card_data.type.includes('Equip'));

            if (link.card_id === 40640057) {
                // Kuriboh (Hand trap descartada al GY)
                sendCardToGraveyard(duelState, link.card_data, playerKey);
            } else if (!isField && !isContinuous && !isEquip && !link.is_monster_effect) {
                // Magias Normales (Olla de la Avaricia, Raigeki, Dark Hole), Rápidas y Trampas Normales:
                // Resuelven su efecto una sola vez y van de inmediato al Cementerio liberando la casilla
                sendCardToGraveyard(duelState, link.card_data, playerKey);
                if (link.slot_index !== undefined && link.slot_index >= 0) {
                    duelState[playerKey].spells[link.slot_index] = null;
                }
            } else if ((isContinuous || isEquip) && link.slot_index !== undefined && link.slot_index >= 0) {
                // Cartas continuas y de equipo: Permanecen activas boca arriba en el campo
                if (duelState[playerKey].spells[link.slot_index]) {
                    duelState[playerKey].spells[link.slot_index].faceDown = false;
                    duelState[playerKey].spells[link.slot_index].position = 'FACEUP';
                }
            } else if (isField) {
                // Carta de Campo: Permanece en la casilla de campo, liberar casilla normal si ocupó alguna
                if (link.slot_index !== undefined && link.slot_index >= 0) {
                    duelState[playerKey].spells[link.slot_index] = null;
                }
            }
        }
    }

    duelState.chainWindowActive = false;
    if (roomChainTimers.has(roomId)) {
        clearTimeout(roomChainTimers.get(roomId));
        roomChainTimers.delete(roomId);
    }

    // Si el ataque pendiente es del jugador humano (PvP), resolver
    if (duelState.pendingAction && !duelState.pendingAction.isNpcAttack) {
        const pending = duelState.pendingAction;
        duelState.pendingAction = null;
        if (pending.type === 'ATTACK') {
            proceedWithAttackExecution(roomId, pending.attackerSlot, pending.targetSlot, pending);
        }
    }

    // Si una rutina asíncrona (como el turno del NPC) estaba esperando resolución de la cadena
    if (roomChainCallbacks.has(roomId)) {
        const callback = roomChainCallbacks.get(roomId);
        roomChainCallbacks.delete(roomId);
        if (typeof callback === 'function') callback();
    }

    enrichDuelStateForBroadcast(duelState);
    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
}

/**
 * Apertura de Ventana de Interrupción ("A la Inversa")
 */
function promptChainWindow(roomId, triggerMessage, activeCardData, reactingPlayerName) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    duelState.chainWindowActive = true;
    const currentLink = duelState.activeChain.length + 1;

    console.log(`[OCG CHAIN WINDOW] Preguntando prioridad a ${reactingPlayerName} ante: ${triggerMessage}`);

    // Si el que responde es el NPC:
    if (reactingPlayerName === duelState.player2.username) {
        const npc = duelState.player2;
        
        // Determinar si el NPC tiene una trampa o magia rápida válida para encadenar
        let npcTrapIdx = -1;
        for (let i = 0; i < 5; i++) {
            const s = npc.spells[i];
            if (!s || !s.faceDown) continue;
            const cData = s.card_data || {};
            const isTrap = (cData.type && cData.type.includes('Trap')) || (cData.race && cData.race.includes('Trap'));
            const isQuick = (cData.type && cData.type.includes('Quick-Play')) || (cData.race && cData.race.includes('Quick-Play'));
            
            if (triggerMessage.includes('Ataque')) {
                // Ante ataque: Trampas de respuesta o inmovilización
                if (isTrap || isQuick || [44095762, 62279055, 18807109, 18807108, 44519536, 17814387, 98299711, 4206964].includes(s.card_id)) {
                    npcTrapIdx = i;
                    break;
                }
            } else if (triggerMessage.includes('invocó') || triggerMessage.includes('Invocación')) {
                // Ante invocación: Trap Hole (4206964) o Círculo Atador
                if ([4206964, 18807109, 18807108, 44519536].includes(s.card_id) || isTrap) {
                    npcTrapIdx = i;
                    break;
                }
            } else {
                if (isTrap || isQuick || [18807109, 18807108, 44519536, 5318639].includes(s.card_id)) {
                    npcTrapIdx = i;
                    break;
                }
            }
        }
        
        if (npcTrapIdx !== -1) {
            // NPC encadena su trampa o magia rápida
            const trap = npc.spells[npcTrapIdx];
            trap.faceDown = false;
            let targetData = null;

            // 1. Círculo Atador de Hechizos (18807109 / 18807108 / 44519536)
            if (trap.card_id === 18807109 || trap.card_id === 18807108 || trap.card_id === 44519536) {
                let targetSlot = -1;
                if (duelState.pendingAction && duelState.pendingAction.attackerSlot !== undefined && duelState.player1.monsters[duelState.pendingAction.attackerSlot]) {
                    targetSlot = duelState.pendingAction.attackerSlot;
                } else {
                    let maxAtk = -1;
                    for (let i = 0; i < 5; i++) {
                        const m = duelState.player1.monsters[i];
                        if (m && !m.isTrapped) {
                            const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data.atk || 0);
                            if (atk > maxAtk) {
                                maxAtk = atk;
                                targetSlot = i;
                            }
                        }
                    }
                }
                if (targetSlot !== -1) {
                    targetData = { slot_index: targetSlot, source_slot: npcTrapIdx };
                }
            }
            // 2. Trampa de Caída (Trap Hole 4206964)
            else if (trap.card_id === 4206964) {
                let targetSlot = -1;
                for (let i = 0; i < 5; i++) {
                    const m = duelState.player1.monsters[i];
                    if (m && !m.faceDown) {
                        const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                        if (atk >= 1000) {
                            targetSlot = i;
                            break;
                        }
                    }
                }
                if (targetSlot !== -1) {
                    targetData = { slot_index: targetSlot, source_slot: npcTrapIdx };
                }
            }
            // 3. Tifón del Espacio Místico (5318639)
            else if (trap.card_id === 5318639) {
                let targetSlot = -1;
                let isField = false;
                if (duelState.player1.fieldSpell) {
                    isField = true;
                } else {
                    targetSlot = duelState.player1.spells.findIndex(s => s !== null);
                }
                if (isField || targetSlot !== -1) {
                    targetData = {
                        target_player: 'player1',
                        target_slot: targetSlot,
                        is_field_spell: isField,
                        source_slot: npcTrapIdx
                    };
                }
            }

            duelState.activeChain.push({
                chainLink: currentLink,
                player: npc.username,
                card_id: trap.card_id,
                card_data: trap.card_data,
                slot_index: npcTrapIdx,
                target_data: targetData
            });
            const targetMsg = (targetData && targetData.slot_index !== undefined && duelState.player1.monsters[targetData.slot_index])
                ? ` (apuntando a ${duelState.player1.monsters[targetData.slot_index].card_data.name} en casilla #${targetData.slot_index + 1})`
                : '';
            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${currentLink}] ¡${npc.username} encadena "${trap.card_data.name}"${targetMsg}!`, 'chain');
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            
            // Dar oportunidad al jugador de responder a la trampa del NPC
            setTimeout(() => promptChainWindow(roomId, `NPC activó ${trap.card_data.name}`, trap.card_data, duelState.player1.username), 1000);
        } else {
            // NPC pasa la prioridad
            console.log(`[OCG CHAIN] ${npc.username} pasa su prioridad de respuesta.`);
            setTimeout(() => resolveActiveChain(roomId), 800);
        }
        return;
    }

    // Si el que responde es el Jugador Humano: emitir OCG_PROMPT_CHAIN con temporizador de 8s
    const player = duelState.player1;
    
    // Detectar qué cartas rápidas, trampas o hand traps (Kuriboh) elegibles tiene el jugador
    const playableCards = [];
    player.spells.forEach((s, idx) => {
        if (s && (s.faceDown || s.position === 'SET')) {
            const cData = s.card_data || {};
            const isTrap = (cData.type && cData.type.includes('Trap')) || (cData.race && cData.race.includes('Trap'));
            const isQuickPlay = (cData.race === 'Quick-Play') || (cData.type && cData.type.includes('Quick-Play'));
            if (isTrap || isQuickPlay) {
                playableCards.push({ slot_index: idx, card_id: s.card_id, name: cData.name || 'Carta', location: 'FIELD' });
            }
        }
    });
    player.hand.forEach((c, idx) => {
        if (c && ((c.type && (c.type.includes('Quick-Play') || c.race === 'Quick-Play')) || c.id === 40640057 || c.card_id === 40640057)) {
            playableCards.push({ hand_index: idx, card_id: c.id || c.card_id, name: c.name, location: 'HAND' });
        }
    });

    if (playableCards.length === 0) {
        console.log(`[OCG CHAIN] ${player.username} no tiene cartas elegibles para encadenar. Pasando automáticamente.`);
        setTimeout(() => resolveActiveChain(roomId), 400);
        return;
    }

    if (getIo()) getIo().to(roomId).emit('OCG_PROMPT_CHAIN', {
        message: triggerMessage,
        chain_link: currentLink,
        timeout: 8000,
        allowed_cards: playableCards
    });

    // Temporizador de 8 segundos si el jugador no responde
    if (roomChainTimers.has(roomId)) clearTimeout(roomChainTimers.get(roomId));
    roomChainTimers.set(roomId, setTimeout(() => {
        console.log('[OCG CHAIN TIMEOUT] Expira ventana de respuesta del jugador. Procediendo a resolver...');
        resolveActiveChain(roomId);
    }, 8000));
}

/**
 * Ejecución del Daño de Batalla tras Ventana de Respuestas
 */
async function proceedWithAttackExecution(roomId, attackerSlot, targetSlot, pendingOpts = {}) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    if (pendingOpts.negated) {
        console.log(`[OCG BATTLE] Ataque anulado por efecto.`);
        emitDuelLog(roomId, `🛡️ El ataque fue anulado por efecto de carta.`, 'battle');
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return;
    }

    const p1 = duelState.player1;
    const p2 = duelState.player2;
    const attacker = p1.monsters[attackerSlot];

    if (!attacker || attacker.position !== 'ATK') {
        console.log(`[OCG BATTLE] El atacante ya no es válido para continuar el ataque.`);
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return;
    }

    const defender = targetSlot >= 0 && targetSlot < 5 ? p2.monsters[targetSlot] : null;
    const attackerAtk = attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.card_data.atk || 0);

    const isProtected = pendingOpts.kuribohProtected || duelState.kuribohShieldActive;
    if (duelState.kuribohShieldActive) duelState.kuribohShieldActive = false;

    if (!defender) {
        // Daño directo
        const dmg = isProtected ? 0 : attackerAtk;
        p2.lp = Math.max(0, p2.lp - dmg);
        attacker.hasAttacked = true;
        if (isProtected) {
            emitDuelLog(roomId, `🛡️ ¡El daño directo de ${attacker.card_data.name} fue reducido a 0 por Kuriboh!`, 'battle');
        } else {
            emitDuelLog(roomId, `⚔️💥 ¡Ataque Directo! ${attacker.card_data.name} asesta ${attackerAtk} puntos de daño directo a ${p2.username}. (LP Rival: ${p2.lp})`, 'battle');
        }
    } else {
        // Batalla monstruo vs monstruo
        const defAtk = defender.currentAtk !== undefined ? defender.currentAtk : (defender.card_data.atk || 0);
        const defDef = defender.currentDef !== undefined ? defender.currentDef : (defender.card_data.def || 0);

        if (defender.position === 'ATK') {
            const diff = attackerAtk - defAtk;
            if (diff > 0) {
                sendCardToGraveyard(duelState, defender, 'player2');
                p2.monsters[targetSlot] = null;
                const dmg = isProtected ? 0 : diff;
                p2.lp = Math.max(0, p2.lp - dmg);
                emitDuelLog(roomId, `⚔️💥 ${attacker.card_data.name} destruye a ${defender.card_data.name} en combate! ${p2.username} recibe ${dmg} de daño. (LP: ${p2.lp})`, 'battle');
            } else if (diff < 0) {
                sendCardToGraveyard(duelState, attacker, 'player1');
                p1.monsters[attackerSlot] = null;
                const recoil = isProtected ? 0 : Math.abs(diff);
                p1.lp = Math.max(0, p1.lp - recoil);
                emitDuelLog(roomId, `⚔️💥 ¡Contragolpe! ${attacker.card_data.name} es destruido por ${defender.card_data.name}. ${p1.username} recibe ${recoil} de daño. (LP: ${p1.lp})`, 'battle');
            } else {
                sendCardToGraveyard(duelState, attacker, 'player1');
                p1.monsters[attackerSlot] = null;
                sendCardToGraveyard(duelState, defender, 'player2');
                p2.monsters[targetSlot] = null;
                emitDuelLog(roomId, `⚔️💥 ¡Doble K.O.! Ambos monstruos ${attacker.card_data.name} y ${defender.card_data.name} se destruyen mutuamente.`, 'battle');
            }
        } else {
            // Defender en DEF
            const wasFaceDown = defender.faceDown;
            defender.faceDown = false;

            // Ejecutar efecto de Volteo si el monstruo estaba boca abajo
            if (wasFaceDown && defender.card_data) {
                const flipId = defender.card_id || defender.card_data.id;
                const isFlip = (defender.card_data.type && typeof defender.card_data.type === 'string' && defender.card_data.type.includes('Flip')) 
                    || (defender.card_data && (Number(defender.card_data.type) & 0x200000)) 
                    || [54652250, 7089711, 9076207, 33066139].includes(flipId);
                if (isFlip) {
                    emitDuelLog(roomId, `⚡ [Efecto de Volteo] ¡${defender.card_data.name} activa su efecto de Volteo al ser atacado!`, 'effect');
                    duelState.pendingAction = { type: 'ATTACK', attackerSlot: attackerSlot };
                    await executeCardEffect(roomId, defender.card_data, 'player2', 'player1', {
                        slot_index: attackerSlot,
                        target_slot: attackerSlot,
                        target_player: 'player1'
                    });
                    duelState.pendingAction = null;
                }
            }

            // Si el atacante fue destruido o devuelto a la mano por el volteo, abortar daño de batalla
            if (!p1.monsters[attackerSlot]) {
                emitDuelLog(roomId, `⚔️ El atacante fue removido del campo por el efecto de volteo.`, 'battle');
            } else if (attackerAtk > defDef) {
                sendCardToGraveyard(duelState, defender, 'player2');
                p2.monsters[targetSlot] = null;
                emitDuelLog(roomId, `⚔️🛡️ ${attacker.card_data.name} pulveriza la defensa de ${defender.card_data.name} y lo envía al Cementerio.`, 'battle');
            } else if (defDef > attackerAtk) {
                const recoil = isProtected ? 0 : (defDef - attackerAtk);
                p1.lp = Math.max(0, p1.lp - recoil);
                emitDuelLog(roomId, `⚔️🛡️ ¡Defensa inquebrantable! ${defender.card_data.name} resiste el ataque. ${p1.username} recibe ${recoil} de daño reflejado.`, 'battle');
            } else {
                emitDuelLog(roomId, `⚔️🛡️ Ataque empatado contra la defensa de ${defender.card_data.name}. Ningún monstruo es destruido.`, 'battle');
            }
        }
        if (p1.monsters[attackerSlot]) {
            attacker.hasAttacked = true;
        }
    }

    // Chequeo Oficial OCG de Fin de Duelo (LP a 0)
    if (checkDuelGameOver(roomId, duelState)) return;

    enrichDuelStateForBroadcast(duelState);
    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
}

module.exports = {
    executeCardEffect,
    resolveActiveChain,
    promptChainWindow,
    proceedWithAttackExecution,
    setNpcTurnExecutor
};
