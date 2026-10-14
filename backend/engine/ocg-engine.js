/**
 * Ani-Dimension: Core Dimension - Motor Propio de Cadenas LIFO y Efectos de Cartas
 */
const {
    duelRooms,
    roomChainTimers,
    roomChainCallbacks,
    getIo,
    emitDuelLog,
    sendCardToGraveyard,
    sendCardToBanished,
    cleanupOrphanedEquipCards,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver,
    recalculateAllFieldMonstersStats,
    getRoomManifest
} = require('./duel-state');

const { ocgCardReader } = require('../data/sql-card-reader');

let executeNpcTurnRef = () => {};
function setNpcTurnExecutor(fn) {
    executeNpcTurnRef = fn;
}

function checkIsFlipMonster(cardObj) {
    if (!cardObj) return false;
    const cd = cardObj.card_data || cardObj;
    const cId = Number(cardObj.card_id || cd.id || cd.card_id || 0);
    const typeStr = (cd.type || '').toString().toLowerCase();
    if (typeStr.includes('flip')) return true;
    if (cd.typeCode && (Number(cd.typeCode) & 0x200000)) return true;
    const manifest = getRoomManifest();
    const meta = manifest ? manifest.get(cId) : null;
    return Boolean(meta?.isFlip);
}

async function checkBattleDestroyedTriggers(roomId, duelState, destroyedMonster, controllerKey) {
    if (!destroyedMonster) return;
    const cId = Number(destroyedMonster.card_id || (destroyedMonster.card_data ? destroyedMonster.card_data.id : 0));
    const controller = duelState[controllerKey];
    if (!controller) return;

    const manifest = getRoomManifest(roomId);
    const meta = manifest ? manifest.get(cId) : null;
    const cardModule = meta ? meta.module : null;

    if (cardModule) {
        const handler = cardModule.onDeath || cardModule.onBattleDestroyed || cardModule.onDestroyed;
        if (typeof handler === 'function') {
            try {
                const opponentKey = controllerKey === 'player1' ? 'player2' : 'player1';
                const { effectUtils } = require('./card-registry');
                await handler.call(cardModule, {
                    roomId,
                    duelState,
                    playerKey: controllerKey,
                    opponentKey,
                    destroyedMonster,
                    effectUtils
                });
            } catch (e) {
                console.error(`[TRIGGER ON DEATH ERROR] Error ejecutando trigger nativo de ${meta.name}:`, e);
            }
        }
    }
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
        let lvl = cd.level;
        if (cId) {
            const db = ocgCardReader(cId);
            if (db) {
                if (r === undefined) r = db.raceCode;
                if (a === undefined) a = db.attributeCode;
                if (t === undefined) t = db.typeCode;
                if (lvl === undefined) lvl = db.level;
            }
        }
        if (t === undefined) {
            const strType = cd.type || '';
            if (strType.includes('Spell')) t = 0x02;
            else if (strType.includes('Trap')) t = 0x04;
            else t = 0x11;
        }
        const isMonster = (t & 0x01) !== 0;
        return {
            id: cId,
            race: r || 0,
            attribute: a || 0,
            type: t,
            level: isMonster ? (lvl !== undefined && lvl !== null ? lvl : 4) : 0
        };
    };

    // Zona de Monstruos (LOCATION_MZONE = 0x04)
    [p1, p2].forEach((p, pIdx) => {
        if (p && p.monsters) {
            for (let i = 0; i < 5; i++) {
                const m = p.monsters[i];
                if (m) {
                    const meta = getRaceAttrType(m);
                    const pos = m.faceDown ? 0x08 : (m.position === 'DEF' ? 0x04 : 0x01);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
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

        // Zona de Magias y Trampas (LOCATION_SZONE = 0x08)
        if (p && p.spells) {
            for (let i = 0; i < 5; i++) {
                const s = p.spells[i];
                if (s) {
                    const meta = getRaceAttrType(s);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: i,
                        location: 0x08,
                        position: s.faceDown ? 0x08 : 0x01,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type || 0x02,
                        attack: 0,
                        defense: 0
                    });
                }
            }
        }

        // Carta de Campo (LOCATION_FZONE = 0x100 / LOCATION_SZONE = 0x08)
        if (p && p.fieldSpell) {
            const fs = p.fieldSpell;
            const meta = getRaceAttrType(fs);
            cards.push({
                id: meta.id,
                owner: pIdx,
                sequence: 5,
                location: 0x100,
                position: 0x01,
                race: meta.race,
                attribute: meta.attribute,
                type: meta.type || 0x80002,
                attack: 0,
                defense: 0
            });
        }

        // Mano (LOCATION_HAND = 0x02)
        if (p && p.hand) {
            p.hand.forEach((h, idx) => {
                if (h) {
                    const meta = getRaceAttrType(h);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: idx,
                        location: 0x02,
                        position: 0x01,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type,
                        attack: h.atk || 0,
                        defense: h.def || 0
                    });
                }
            });
        }

        // Cementerio (LOCATION_GRAVE = 0x10)
        if (p && p.graveyard) {
            p.graveyard.forEach((g, idx) => {
                if (g) {
                    const meta = getRaceAttrType(g);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: idx,
                        location: 0x10,
                        position: 0x01,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type,
                        attack: g.atk || 0,
                        defense: g.def || 0
                    });
                }
            });
        }

        // Deck Principal (LOCATION_DECK = 0x01)
        if (p && p.deck) {
            p.deck.forEach((d, idx) => {
                if (d) {
                    const meta = getRaceAttrType(d);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: idx,
                        location: 0x01,
                        position: 0x08,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type,
                        attack: d.atk || 0,
                        defense: d.def || 0
                    });
                }
            });
        }

        // Extra Deck (LOCATION_EXTRA = 0x40)
        if (p && p.extraDeck) {
            p.extraDeck.forEach((ex, idx) => {
                if (ex) {
                    const meta = getRaceAttrType(ex);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: idx,
                        location: 0x40,
                        position: 0x08,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type,
                        attack: ex.atk || 0,
                        defense: ex.def || 0
                    });
                }
            });
        }

        // Cartas Desterradas / Removidas (LOCATION_REMOVED = 0x20)
        const removedCards = p.banished || p.removed || [];
        if (removedCards.length > 0) {
            removedCards.forEach((rm, idx) => {
                if (rm) {
                    const meta = getRaceAttrType(rm);
                    cards.push({
                        id: meta.id,
                        owner: pIdx,
                        sequence: idx,
                        location: 0x20,
                        position: 0x01,
                        race: meta.race,
                        attribute: meta.attribute,
                        type: meta.type,
                        attack: rm.atk || 0,
                        defense: rm.def || 0
                    });
                }
            });
        }
    });

    return cards;
}

function isDragonMonster(m) {
    if (!m) return false;
    const mData = m.card_data || (typeof ocgCardReader === 'function' ? ocgCardReader(m.card_id || m.id) : null) || m;
    const race = (mData.race || m.race || '').toString().toLowerCase();
    const type = (mData.type || m.type || '').toString().toLowerCase();
    const name = (mData.name || m.name || '').toString().toLowerCase();
    const raceCode = Number(mData.raceCode || m.raceCode || 0);
    
    if ((raceCode & 0x2000) !== 0) return true; // RACE_DRAGON = 0x2000
    if (race === 'dragon' || race.includes('dragon') || race.includes('dragón')) return true;
    if (type.includes('dragon') || type.includes('dragón')) return true;
    if (name.includes('dragon') || name.includes('dragón')) return true;
    const manifest = getRoomManifest();
    const meta = manifest ? manifest.get(m.card_id || m.id || mData.id) : null;
    return Boolean(meta?.isDragon);
}

function isDragonJarActiveOnField(duelState) {
    if (!duelState) return false;
    const p1Spells = (duelState.player1 && duelState.player1.spells) || [];
    const p2Spells = (duelState.player2 && duelState.player2.spells) || [];
    const manifest = getRoomManifest(duelState.roomId);
    return [...p1Spells, ...p2Spells].some(s => {
        if (!s || s.faceDown || s.position === 'SET') return false;
        const cId = Number(s.card_id || s.id || (s.card_data ? (s.card_data.id || s.card_data.card_id) : 0));
        const meta = manifest ? manifest.get(cId) : null;
        return Boolean(meta?.isDragonTrap);
    });
}

const { getCardEffect, hasCardEffect, executeNativeCardEffect } = require('./card-registry');

async function executeCardEffect(roomId, cardData, playerKey, opponentKey, targetData = null, link = null) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    const player = duelState[playerKey];
    const opponent = duelState[opponentKey];
    const cardId = cardData.id || cardData.card_id;
    const numCardId = Number(cardId);
    let nativeExecuted = false;

    // 1. PRIORIDAD MAESTRA: Ejecución Nativa de Código JavaScript (Deshabilita 100% Lua WASM y OCGCore)
    if (hasCardEffect(numCardId)) {
        const nativeRes = await executeNativeCardEffect(roomId, cardData, playerKey, opponentKey, targetData, link);
        if (nativeRes && !nativeRes.noNativeEffect) {
            nativeExecuted = true;
            return; // Deshabilitado el motor Lua para esta carta, ejecutado nativamente en JS
        }
    }

    const manifest = getRoomManifest(roomId);
    const cardMeta = manifest ? manifest.get(numCardId) : null;
    const isSwords = Boolean(cardMeta?.isSwords);
    const isDragonJar = Boolean(cardMeta?.isDragonTrap);

    const isSpellTrapEffect = Boolean(cardMeta?.isSpell || cardMeta?.isTrap || cardMeta?.isSpellTrapRemoval)
        || (targetData && (targetData.is_spell_trap || targetData.is_field_spell || targetData.target_is_spell_trap));

    const targetSlotIdx = (targetData && targetData.target_slot !== undefined) 
        ? targetData.target_slot 
        : (targetData && targetData.slot_index !== undefined ? targetData.slot_index : undefined);

    let targetPos = 'ATK';
    let targetCardId = 0;
    if (targetData && targetSlotIdx !== undefined) {
        const tPKey = targetData.target_player || opponentKey;
        const tPl = duelState[tPKey];
        if (isSpellTrapEffect) {
            if (targetData.is_field_spell && tPl && tPl.fieldSpell) {
                targetCardId = tPl.fieldSpell.card_id || (tPl.fieldSpell.card_data ? tPl.fieldSpell.card_data.id : 0);
            } else if (tPl && tPl.spells && tPl.spells[targetSlotIdx]) {
                const s = tPl.spells[targetSlotIdx];
                targetCardId = s.card_id || (s.card_data ? s.card_data.id : 0);
            }
        } else if (tPl && tPl.monsters && tPl.monsters[targetSlotIdx]) {
            const m = tPl.monsters[targetSlotIdx];
            targetPos = m.position || 'ATK';
            targetCardId = m.card_id || (m.card_data ? m.card_data.id : 0);
        }
    }

    const allFieldCards = buildFieldCardsForLua(duelState, playerKey, opponentKey);

    // Contexto oficial conectado al estado de la sala de duelo y Lua Runner
    const context = {
        turnPlayerIndex: playerKey === 'player1' ? 0 : 1,
        targetPosition: targetPos,
        targetCardId: targetCardId,
        targetSlot: targetSlotIdx,
        targetLocation: isSpellTrapEffect ? ((targetData && targetData.is_field_spell) ? 0x10 : 0x08) : 0x04,
        targetPlayer: (targetData && targetData.target_player) ? targetData.target_player : opponentKey,
        fieldCards: allFieldCards,

        onDraw: (playerIdx, count) => {
            const targetPlayer = playerIdx === 0 ? duelState.player1 : duelState.player2;
            const targetKey = playerIdx === 0 ? 'player1' : 'player2';
            let drawn = 0;
            for (let i = 0; i < count; i++) {
                if (targetPlayer.deck.length === 0) {
                    checkDeckOut(roomId, duelState, targetKey);
                    return;
                }
                const card = targetPlayer.deck.pop();
                targetPlayer.hand.push(card);
                drawn++;
            }
            targetPlayer.mainDeckCount = targetPlayer.deck.length;
            emitDuelLog(roomId, `✨ [Efecto Lua] ${targetPlayer.username} roba ${drawn} carta(s) de su Deck por efecto de "${cardData.name}".`, 'spell');
            checkDuelGameOver(roomId, duelState);
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

            // Determinar a qué jugador pertenece la carta destruida
            let tPlayerKey = (targetData && targetData.target_player) 
                ? targetData.target_player 
                : (ownerIdx !== undefined ? (ownerIdx === 0 ? playerKey : opponentKey) : opponentKey);

            const tPlayer = duelState[tPlayerKey];
            if (!tPlayer) return;

            // Determinar casilla objetivo (priorizar selección interactiva de targetData)
            let effectiveSlotIdx = (targetData && targetData.target_slot !== undefined) 
                ? targetData.target_slot 
                : (targetData && targetData.slot_index !== undefined ? targetData.slot_index : slotIdx);

            const isFieldSpell = Boolean(targetData && (targetData.is_field_spell || targetData.is_field));
            const isSpellTrapTarget = isFieldSpell || Boolean(targetData && (targetData.is_spell_trap || targetData.target_is_spell_trap)) || isSpellTrapEffect;

            if (isFieldSpell || location === 0x10) {
                if (tPlayer.fieldSpell) {
                    const fsCard = tPlayer.fieldSpell;
                    sendCardToGraveyard(duelState, fsCard, tPlayerKey);
                    tPlayer.fieldSpell = null;
                    emitDuelLog(roomId, `🌪️ [Efecto Destrucción] ¡"${cardData.name}" destruyó la Carta de Campo "${fsCard.card_data ? fsCard.card_data.name : 'Campo'}" (${tPlayer.username})!`, 'spell');
                }
            } else if (location === 0x08 || isSpellTrapTarget) {
                if (effectiveSlotIdx !== undefined && effectiveSlotIdx >= 0 && tPlayer.spells && tPlayer.spells[effectiveSlotIdx]) {
                    const sCard = tPlayer.spells[effectiveSlotIdx];
                    sendCardToGraveyard(duelState, sCard, tPlayerKey);
                    tPlayer.spells[effectiveSlotIdx] = null;
                    emitDuelLog(roomId, `🌪️ [Efecto Destrucción] ¡"${cardData.name}" destruyó la carta Mágica/Trampa "${sCard.card_data ? sCard.card_data.name : 'Carta'}" en casilla #${effectiveSlotIdx + 1} (${tPlayer.username})!`, 'spell');
                }
            } else {
                if (effectiveSlotIdx !== undefined && effectiveSlotIdx >= 0 && tPlayer.monsters && tPlayer.monsters[effectiveSlotIdx]) {
                    const targetMonster = tPlayer.monsters[effectiveSlotIdx];
                    sendCardToGraveyard(duelState, targetMonster, tPlayerKey);
                    tPlayer.monsters[effectiveSlotIdx] = null;
                    emitDuelLog(roomId, `⚡💥 [Efecto Destrucción] ¡"${cardData.name}" destruyó a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" en casilla #${effectiveSlotIdx + 1} (${tPlayer.username})!`, 'spell');
                }
            }

            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
                duelState.pendingAction.negated = true;
            }
        },

        onToHand: (targetCardId, slotIdx, ownerIdx, location) => {
            const numTId = Number(targetCardId);
            const tOwnerKey = ownerIdx === 0 ? playerKey : (ownerIdx === 1 ? opponentKey : playerKey);
            const tPlayer = duelState[tOwnerKey];
            if (!tPlayer) return;

            if (location === 0x01 || location === 'DECK') {
                // Extraer del Deck a la Mano (Búsquedas tipo Dragón del Trueno, Sangan, etc.)
                const dIdx = tPlayer.deck ? tPlayer.deck.findIndex(c => Number(c.id || c.card_id) === numTId) : -1;
                if (dIdx !== -1) {
                    const [foundCard] = tPlayer.deck.splice(dIdx, 1);
                    tPlayer.hand.push(foundCard);
                    tPlayer.mainDeckCount = tPlayer.deck.length;
                    const cData = ocgCardReader(numTId) || foundCard.card_data || foundCard;
                    emitDuelLog(roomId, `🖐️ [Efecto Lua] ${tPlayer.username} añadió "${cData.name || 'Carta'}" de su Deck a su mano.`, 'spell');
                }
            } else if (location === 0x10 || location === 'GRAVE') {
                // Recuperar del Cementerio a la Mano
                const gIdx = tPlayer.graveyard ? tPlayer.graveyard.findIndex(c => Number(c.id || c.card_id) === numTId) : -1;
                if (gIdx !== -1) {
                    const [foundCard] = tPlayer.graveyard.splice(gIdx, 1);
                    tPlayer.hand.push(foundCard);
                    const cData = ocgCardReader(numTId) || foundCard.card_data || foundCard;
                    emitDuelLog(roomId, `🖐️ [Efecto Lua] ${tPlayer.username} recuperó "${cData.name || 'Carta'}" del Cementerio a su mano.`, 'spell');
                }
            } else {
                // Devolver del Campo a la Mano (Rebote tipo Pingüino Soldado)
                let targetIdx = -1;
                let targetPKey = opponentKey;
                if (targetData && (targetData.target_slot !== undefined || targetData.slot_index !== undefined)) {
                    targetPKey = targetData.target_player || opponentKey;
                    targetIdx = targetData.target_slot !== undefined ? targetData.target_slot : targetData.slot_index;
                } else if (slotIdx !== undefined && slotIdx >= 0) {
                    targetIdx = slotIdx;
                } else if (duelState.pendingAction && duelState.pendingAction.attackerSlot !== undefined) {
                    targetIdx = duelState.pendingAction.attackerSlot;
                } else {
                    targetIdx = opponent.monsters.findIndex(m => m !== null);
                }
                if (targetIdx !== -1) {
                    const tPl = duelState[targetPKey];
                    if (tPl && tPl.monsters && tPl.monsters[targetIdx]) {
                        const bounced = tPl.monsters[targetIdx];
                        tPl.monsters[targetIdx] = null;
                        tPl.hand.push(bounced.card_data || bounced);
                        emitDuelLog(roomId, `🔄 [Efecto Lua] ¡"${cardData.name}" devolvió a "${bounced.card_data ? bounced.card_data.name : 'Monstruo'}" a la mano de ${tPl.username}!`, 'spell');
                    }
                }
            }
        },

        onChangePos: (targetCardId, slotIdx, pos) => {
            let targetIdx = -1;
            let targetPKey = opponentKey;
            if (targetData && (targetData.target_slot !== undefined || targetData.slot_index !== undefined)) {
                targetPKey = targetData.target_player || opponentKey;
                targetIdx = targetData.target_slot !== undefined ? targetData.target_slot : targetData.slot_index;
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

        onSpecialSummon: (targetCode, targetPlayerIdx, pos) => {
            const destPlayerKey = targetPlayerIdx !== undefined ? (targetPlayerIdx === 0 ? 'player1' : 'player2') : playerKey;
            const destPlayer = duelState[destPlayerKey];
            if (!destPlayer) return;

            let revived = null;
            let originalOwner = destPlayerKey;
            let fromLocation = 'GRAVE';

            // 1. Extraer objetivo específico según targetData del modal de selección (Reborn)
            if (targetData) {
                const preferredGyKey = targetData.target_gy || (targetData.target_player === 'player2' ? 'player2' : 'player1');
                const targetIdx = targetData.target_index;
                const targetCId = targetData.card_id || targetData.target_card_id || (targetCode > 0 ? targetCode : null);

                if (targetIdx !== undefined && targetIdx >= 0 && duelState[preferredGyKey] && duelState[preferredGyKey].graveyard[targetIdx]) {
                    revived = duelState[preferredGyKey].graveyard.splice(targetIdx, 1)[0];
                    originalOwner = preferredGyKey;
                } else if (targetCId) {
                    for (const gyKey of [preferredGyKey, preferredGyKey === 'player1' ? 'player2' : 'player1']) {
                        if (duelState[gyKey] && duelState[gyKey].graveyard) {
                            const gIdx = duelState[gyKey].graveyard.findIndex(c => (c.id || c.card_id) === targetCId);
                            if (gIdx !== -1) {
                                revived = duelState[gyKey].graveyard.splice(gIdx, 1)[0];
                                originalOwner = gyKey;
                                break;
                            }
                        }
                    }
                }
            }

            // 2. Si no se encontró en Cementerio y hay targetCode, buscar en Deck (Cyber Jar, Tomato, Rat, etc.)
            if (!revived && targetCode && targetCode > 0) {
                if (destPlayer.deck) {
                    const dIdx = destPlayer.deck.findIndex(c => Number(c.id || c.card_id) === Number(targetCode));
                    if (dIdx !== -1) {
                        revived = destPlayer.deck.splice(dIdx, 1)[0];
                        originalOwner = destPlayerKey;
                        fromLocation = 'DECK';
                    }
                }
            }

            // 3. Si sigue sin encontrarse, buscar en Cementerios por targetCode
            if (!revived && targetCode && targetCode > 0) {
                for (const gyKey of [destPlayerKey, destPlayerKey === 'player1' ? 'player2' : 'player1']) {
                    if (duelState[gyKey] && duelState[gyKey].graveyard) {
                        const gIdx = duelState[gyKey].graveyard.findIndex(c => Number(c.id || c.card_id) === Number(targetCode));
                        if (gIdx !== -1) {
                            revived = duelState[gyKey].graveyard.splice(gIdx, 1)[0];
                            originalOwner = gyKey;
                            fromLocation = 'GRAVE';
                            break;
                        }
                    }
                }
            }

            // 4. Fallback: Tomar el primer MONSTRUO válido del cementerio
            if (!revived) {
                for (const gyKey of [destPlayerKey, destPlayerKey === 'player1' ? 'player2' : 'player1']) {
                    if (duelState[gyKey] && duelState[gyKey].graveyard) {
                        const mIdx = duelState[gyKey].graveyard.findIndex(c => {
                            const cData = ocgCardReader(c.id || c.card_id) || c.card_data || c;
                            return cData && cData.type && cData.type.includes('Monster');
                        });
                        if (mIdx !== -1) {
                            revived = duelState[gyKey].graveyard.splice(mIdx, 1)[0];
                            originalOwner = gyKey;
                            fromLocation = 'GRAVE';
                            break;
                        }
                    }
                }
            }

            if (revived) {
                const cId = parseInt(revived.id || revived.card_id, 10);
                const fullCardData = ocgCardReader(cId) || revived.card_data || revived;
                const emptySlot = destPlayer.monsters.findIndex(m => m === null);
                if (emptySlot !== -1) {
                    const isFaceDown = (pos === 0x08 || pos === 'DEF_SET');
                    const position = (pos === 0x04 || pos === 0x08) ? 'DEF' : 'ATK';
                    destPlayer.monsters[emptySlot] = {
                        card_id: cId,
                        position: position,
                        faceDown: isFaceDown,
                        hasAttacked: false,
                        turnSummoned: duelState.turnNumber,
                        hasChangedPosition: false,
                        originalOwner: originalOwner,
                        card_data: { 
                            ...fullCardData, 
                            id: cId, 
                            card_id: cId, 
                            originalOwner: originalOwner 
                        }
                    };
                    calculateMonsterCurrentStats(destPlayer.monsters[emptySlot], duelState);
                    const fromMsg = fromLocation === 'DECK' ? 'desde su Deck' : `desde el Cementerio de ${duelState[originalOwner].username}`;
                    emitDuelLog(roomId, `✨⭐ [Invocación Especial] ¡${destPlayer.username} invocó a "${fullCardData.name || 'Monstruo'}" ${fromMsg}!`, 'summon');
                } else {
                    if (fromLocation === 'DECK') {
                        destPlayer.deck.push(revived);
                    } else {
                        duelState[originalOwner].graveyard.push(revived);
                    }
                    emitDuelLog(roomId, `⚠️ No hay casillas de monstruo disponibles para la Invocación Especial en el campo de ${destPlayer.username}.`, 'phase');
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

    // 2. Efectos continuos, de equipo o campo que requieren enlace en estado de juego
    const fullDbData = (typeof ocgCardReader === 'function' ? ocgCardReader(numCardId) : null) || cardData || {};
    const typeStr = (fullDbData.type || cardData.type || '').toString().toLowerCase();
    const raceStr = (fullDbData.race || cardData.race || '').toString().toLowerCase();
    const typeCode = Number(fullDbData.typeCode || cardData.typeCode || 0);

    const isField = typeStr.includes('field') || raceStr.includes('field') || ((typeCode & 0x80000) !== 0);
    const isEquip = typeStr.includes('equip') || raceStr.includes('equip') || ((typeCode & 0x40000) !== 0);
    const isContinuousTrap = (typeStr.includes('continuous') || raceStr.includes('continuous') || ((typeCode & 0x20000) !== 0)) && typeStr.includes('trap');

    if (isField) {
        if (player.fieldSpell) {
            sendCardToGraveyard(duelState, player.fieldSpell, playerKey);
            player.fieldSpell = null;
        }
        player.fieldSpell = { card_id: cardId, card_data: fullDbData || cardData };
        recalculateAllFieldMonstersStats(duelState);
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
            const sourceSlot = (link && link.slot_index !== undefined && link.slot_index >= 0) 
                ? link.slot_index 
                : player.spells.findIndex(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === numCardId);

            if (!eqMonster.attachedEffects) eqMonster.attachedEffects = [];
            eqMonster.attachedEffects.push({
                card_id: cardId,
                card_name: cardData.name,
                effect_type: 'EQUIP',
                source_player: playerKey,
                source_slot: sourceSlot,
                atkDelta: 0,
                defDelta: 0
            });
            calculateMonsterCurrentStats(eqMonster, duelState, targetPKey);
            emitDuelLog(roomId, `🗡️ [Magia de Equipo] "${cardData.name}" equipado a "${eqMonster.card_data ? eqMonster.card_data.name : 'Monstruo'}".`, 'spell');
        }
    } else if (isContinuousTrap && !isDragonJar) {
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

    // =========================================================================
    // EJECUCIÓN DINÁMICA MODULAR (CERO PASSCODES HARDCODEADOS EN EL MOTOR)
    // =========================================================================
    if (!nativeExecuted) {
        if (cardMeta && cardMeta.module) {
            const handler = cardMeta.module.onActivate || cardMeta.module.execute;
            if (typeof handler === "function") {
                const { effectUtils } = require("./card-registry");
                await handler.call(cardMeta.module, duelState, playerKey, opponentKey, targetData, link, effectUtils);
                return;
            }
        }
        if (!isField && !isEquip && !isContinuousTrap && !isSwords) {
            emitDuelLog(roomId, `✨ [Efecto] ${player.username} activó "${cardData.name}".`, "spell");
        }
    }
}
/**
 * Resolución de Cadena Oficial LIFO (Last In, First Out)
 */
async function resolveActiveChain(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;

    try {
        if (duelState.activeChain && duelState.activeChain.length > 0) {
            console.log(`[OCG CHAIN] Iniciando Resolución de Cadena LIFO (${duelState.activeChain.length} eslabones)...`);
            emitDuelLog(roomId, `⛓️ === RESOLVIENDO CADENA (${duelState.activeChain.length} Eslabones) ===`, 'chain');

            const manifest = getRoomManifest(roomId);

            // Procesar en orden inverso (LIFO)
            while (duelState.activeChain.length > 0) {
                const link = duelState.activeChain.pop();
                if (!link || !link.card_data) continue;

                const playerKey = link.player === duelState.player1.username ? 'player1' : 'player2';
                const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';

                emitDuelLog(roomId, `⛓️ [Eslabón ${link.chainLink}] Resolviendo efecto de "${link.card_data.name}" (${link.player})...`, 'chain');
                
                try {
                    // Ejecutar el efecto correspondiente en Lua o JS nativo
                    await executeCardEffect(roomId, link.card_data, playerKey, opponentKey, link.target_data, link);
                } catch (linkErr) {
                    console.error(`[OCG CHAIN] Error ejecutando efecto del eslabón ${link.chainLink} (${link.card_data.name}):`, linkErr);
                    emitDuelLog(roomId, `⚠️ Error al resolver efecto de "${link.card_data.name}": ${linkErr.message}`, 'system');
                }

                const numCardId = Number(link.card_id || link.card_data.id || 0);
                const fullCardData = (typeof ocgCardReader === 'function' ? ocgCardReader(numCardId) : null) || link.card_data || {};
                const typeStr = (fullCardData.type || link.card_data?.type || '').toString().toLowerCase();
                const raceStr = (fullCardData.race || link.card_data?.race || '').toString().toLowerCase();
                const typeCode = Number(fullCardData.typeCode || link.card_data?.typeCode || 0);
                const cardMeta = manifest ? manifest.get(numCardId) : null;

                const isField = Boolean(cardMeta?.isField || typeStr.includes('field') || raceStr.includes('field') || ((typeCode & 0x80000) !== 0));
                const isEquip = Boolean(cardMeta?.isEquip || typeStr.includes('equip') || raceStr.includes('equip') || ((typeCode & 0x40000) !== 0));
                const isSwords = Boolean(cardMeta?.isSwords);
                const isDragonJar = Boolean(cardMeta?.isDragonTrap);
                const isContinuous = Boolean(cardMeta?.isContinuous || typeStr.includes('continuous') || raceStr.includes('continuous') || ((typeCode & 0x20000) !== 0));
                const remainsOnField = Boolean(cardMeta?.remainsOnField || isContinuous || isEquip || isSwords || isDragonJar);

                if (cardMeta?.isHandTrap) {
                    // Hand trap descartada al GY
                    sendCardToGraveyard(duelState, link.card_data, playerKey);
                } else if (!isField && !remainsOnField && !link.is_monster_effect) {
                    // Magias Normales, Rápidas y Trampas Normales:
                    // Resuelven su efecto una sola vez y van de inmediato al Cementerio liberando la casilla
                    sendCardToGraveyard(duelState, link.card_data, playerKey);
                    if (link.slot_index !== undefined && link.slot_index >= 0 && duelState[playerKey] && duelState[playerKey].spells) {
                        duelState[playerKey].spells[link.slot_index] = null;
                    }
                } else if (remainsOnField) {
                    // Cartas continuas, de equipo, Espadas de Luz Reveladora y Jarra de Captura de Dragones
                    let sIdx = (link.slot_index !== undefined && link.slot_index >= 0) ? link.slot_index : -1;
                    if (sIdx === -1 && duelState[playerKey] && duelState[playerKey].spells) {
                        sIdx = duelState[playerKey].spells.findIndex(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === numCardId);
                    }
                    if (sIdx !== -1 && duelState[playerKey] && duelState[playerKey].spells && duelState[playerKey].spells[sIdx]) {
                        duelState[playerKey].spells[sIdx].faceDown = false;
                        duelState[playerKey].spells[sIdx].position = 'ACT';
                        if (isSwords) {
                            duelState[playerKey].spells[sIdx].turnCounter = 0;
                            duelState[playerKey].spells[sIdx].swordsActive = true;
                        }
                        if (isDragonJar) {
                            duelState[playerKey].spells[sIdx].dragonJarActive = true;
                        }
                        if (isEquip) {
                            const targetSlot = (link.target_data && link.target_data.target_slot !== undefined)
                                ? link.target_data.target_slot
                                : (link.target_data && link.target_data.slot_index !== undefined ? link.target_data.slot_index : -1);
                            const targetPlayer = (link.target_data && link.target_data.target_player) || playerKey;
                            if (targetSlot >= 0) {
                                duelState[playerKey].spells[sIdx].targetingMonster = { player: targetPlayer, slot: targetSlot };
                            }
                        }
                    }
                } else if (isField) {
                    // Carta de Campo: Permanece en la casilla de campo, liberar casilla normal si ocupó alguna
                    if (link.slot_index !== undefined && link.slot_index >= 0 && duelState[playerKey] && duelState[playerKey].spells) {
                        duelState[playerKey].spells[link.slot_index] = null;
                    }
                }
            }
        }
    } catch (globalErr) {
        console.error(`[OCG CHAIN CRITICAL] Error general en resolución de cadena:`, globalErr);
    } finally {
        duelState.activeChain = [];
        duelState.chainWindowActive = false;
        if (roomChainTimers.has(roomId)) {
            clearTimeout(roomChainTimers.get(roomId));
            roomChainTimers.delete(roomId);
        }
    }

    // Enforcer continuo de la Jarra de Captura de Dragones al resolver cualquier cadena
    if (isDragonJarActiveOnField(duelState)) {
        ['player1', 'player2'].forEach(pKey => {
            const pObj = duelState[pKey];
            if (pObj && pObj.monsters) {
                pObj.monsters.forEach(m => {
                    if (m && !m.faceDown && isDragonMonster(m)) {
                        m.position = 'DEF';
                    }
                });
            }
        });
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

function isNpcPlayer(player, roomId = '') {
    if (!player) return false;
    if (player.isNpc || player.npcId) return true;
    if (roomId && (roomId.startsWith('NPC_') || roomId.includes('_NPC_') || roomId.includes('ADVENTURE_') || roomId.includes('SOLO_') || roomId === 'ROOM_DEMO')) return true;
    const name = (player.username || '').toLowerCase();
    return name.includes('npc') || name.includes('nv.') || name.includes('inteligencia artificial');
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

    // Determinar si el jugador que responde es Player 2 o Player 1
    const isPlayer2Reacting = Boolean(
        reactingPlayerName && 
        duelState.player2 && 
        duelState.player2.username && 
        reactingPlayerName.toLowerCase() === duelState.player2.username.toLowerCase()
    );
    const reactingKey = isPlayer2Reacting ? 'player2' : 'player1';
    const opponentKey = isPlayer2Reacting ? 'player1' : 'player2';
    const reactingPlayer = duelState[reactingKey];
    const opponentPlayer = duelState[opponentKey];
    const isNpcRoom = roomId.startsWith('NPC_') || (duelState.mode === 'NPC') || Boolean(duelState.isNpcDuel) || (roomId === 'ROOM_DEMO') || Boolean(duelState.player2 && (duelState.player2.isNpc || duelState.player2.npcId));
    const isNpc = (isNpcRoom && reactingKey === 'player2') || isNpcPlayer(reactingPlayer, roomId);

    // Si el que responde es un NPC:
    if (isNpc) {
        const npc = reactingPlayer;
        
        // Determinar si el NPC tiene una trampa o magia rápida válida para encadenar
        let npcTrapIdx = -1;
        const msg = (triggerMessage || '').toLowerCase();
        const manifest = getRoomManifest(roomId);

        for (let i = 0; i < 5; i++) {
            const s = npc.spells[i];
            if (!s || !s.faceDown) continue;
            const cId = Number(s.card_id || (s.card_data && s.card_data.id) || 0);
            const cMeta = manifest ? manifest.get(cId) : null;

            if (msg.includes('ataque') || msg.includes('declara')) {
                if (cMeta && cMeta.isAttackTrap) {
                    npcTrapIdx = i;
                    break;
                }
            } else if (msg.includes('invocó') || msg.includes('invocación') || msg.includes('summon')) {
                if (cMeta && cMeta.isSummonTrap) {
                    npcTrapIdx = i;
                    break;
                }
            } else if (msg.includes('activó') || msg.includes('efecto') || msg.includes('magia') || msg.includes('trampa')) {
                if (cMeta && (cMeta.isCounter || cMeta.isSpellTrapRemoval)) {
                    npcTrapIdx = i;
                    break;
                }
            } else {
                if (cMeta && (cMeta.isAttackTrap || cMeta.isSpellTrapRemoval || cMeta.isTargetStun)) {
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
            const trapId = Number(trap.card_id || (trap.card_data && trap.card_data.id) || 0);
            const trapMeta = manifest ? manifest.get(trapId) : null;

            if (trapMeta && trapMeta.isTargetStun) {
                let targetSlot = -1;
                if (duelState.pendingAction && duelState.pendingAction.attackerSlot !== undefined && opponentPlayer.monsters[duelState.pendingAction.attackerSlot]) {
                    targetSlot = duelState.pendingAction.attackerSlot;
                } else {
                    let maxAtk = -1;
                    for (let i = 0; i < 5; i++) {
                        const m = opponentPlayer.monsters[i];
                        if (m && !m.isTrapped) {
                            const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                            if (atk > maxAtk) {
                                maxAtk = atk;
                                targetSlot = i;
                            }
                        }
                    }
                }
                if (targetSlot !== -1) {
                    targetData = { slot_index: targetSlot, target_slot: targetSlot, source_slot: npcTrapIdx };
                }
            } else if (trapMeta && trapMeta.isSummonTrap) {
                let targetSlot = -1;
                for (let i = 0; i < 5; i++) {
                    const m = opponentPlayer.monsters[i];
                    if (m && !m.faceDown) {
                        const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                        if (atk >= 1000) {
                            targetSlot = i;
                            break;
                        }
                    }
                }
                if (targetSlot !== -1) {
                    targetData = { slot_index: targetSlot, target_slot: targetSlot, source_slot: npcTrapIdx };
                }
            }
            else if (trapMeta && trapMeta.isSpellTrapRemoval) {
                let targetSlot = -1;
                let isField = false;
                if (opponentPlayer.fieldSpell) {
                    isField = true;
                } else {
                    targetSlot = opponentPlayer.spells.findIndex(s => s !== null);
                }
                if (isField || targetSlot !== -1) {
                    targetData = {
                        target_player: opponentKey,
                        target_slot: targetSlot,
                        is_field_spell: isField,
                        source_slot: npcTrapIdx
                    };
                }
            }
            else if (trapMeta && trapMeta.isCounter) {
                const lpCost = Math.floor(npc.lp / 2);
                npc.lp = Math.max(1, npc.lp - lpCost);
                emitDuelLog(roomId, `⚖️✨ [Contraefecto] ¡${npc.username} paga ${lpCost} LP para anular la jugada de ${opponentPlayer.username}!`, 'trap');
                if (duelState.pendingAction) {
                    duelState.pendingAction.negated = true;
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
            const targetMsg = (targetData && targetData.slot_index !== undefined && opponentPlayer.monsters[targetData.slot_index])
                ? ` (apuntando a ${opponentPlayer.monsters[targetData.slot_index].card_data.name} en casilla #${targetData.slot_index + 1})`
                : '';
            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${currentLink}] ¡${npc.username} encadena "${trap.card_data.name}"${targetMsg}!`, 'chain');
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            
            // Dar oportunidad al rival de responder a la trampa del NPC
            setTimeout(() => promptChainWindow(roomId, `NPC activó ${trap.card_data.name}`, trap.card_data, opponentPlayer.username), 1000);
        } else {
            // NPC pasa la prioridad
            console.log(`[OCG CHAIN] ${npc.username} pasa su prioridad de respuesta.`);
            setTimeout(() => resolveActiveChain(roomId), 150);
        }
        return;
    }

    // Si el que responde es un Jugador Humano (Player 1 o Player 2 en PvP): emitir OCG_PROMPT_CHAIN con temporizador de 8s
    const player = reactingPlayer;
    duelState.chainWaitingPlayer = player.username;
    const manifest = getRoomManifest(roomId);
    
    // Detectar qué cartas rápidas, trampas o hand traps (Kuriboh) elegibles tiene el jugador
    const playableCards = [];
    (player.spells || []).forEach((s, idx) => {
        if (s && (s.faceDown || s.position === 'SET')) {
            const cData = s.card_data || {};
            const isTrap = (cData.type && cData.type.includes('Trap')) || (cData.race && cData.race.includes('Trap'));
            const isQuickPlay = (cData.race === 'Quick-Play') || (cData.type && cData.type.includes('Quick-Play'));
            if (isTrap || isQuickPlay) {
                playableCards.push({ slot_index: idx, card_id: s.card_id, name: cData.name || 'Carta', location: 'FIELD' });
            }
        }
    });
    (player.hand || []).forEach((c, idx) => {
        const cMeta = manifest ? manifest.get(c.id || c.card_id) : null;
        if (c && (cMeta?.isQuickPlay || cMeta?.isHandTrap || cMeta?.isHandEffect)) {
            playableCards.push({ hand_index: idx, card_id: c.id || c.card_id, name: c.name || cMeta?.name, location: 'HAND' });
        }
    });

    // Detectar monstruos en el campo con Efectos Rápidos elegibles
    (player.monsters || []).forEach((m, idx) => {
        if (m && !m.faceDown) {
            const mData = m.card_data || {};
            const cId = Number(m.card_id || mData.id || 0);
            const mMeta = manifest ? manifest.get(cId) : null;
            if (mMeta && (mMeta.module?.canNegateSpellTrap || (mMeta.isSixSamurai && mMeta.isSynchro)) && !m.usedShiEnNegateThisTurn) {
                const isSpellTrap = activeCardData && ((activeCardData.type || '').toString().toLowerCase().includes('spell') || 
                                                       (activeCardData.type || '').toString().toLowerCase().includes('trap') ||
                                                       (activeCardData.race || '').toString().toLowerCase().includes('spell') ||
                                                       (activeCardData.race || '').toString().toLowerCase().includes('trap'));
                if (isSpellTrap) {
                    playableCards.push({
                        slot_index: idx,
                        card_id: cId,
                        name: `${mData.name || mMeta.name} (Negar y Destruir)`,
                        location: 'FIELD',
                        is_monster_effect: true
                    });
                }
            }
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
        target_player: player.username,
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

    const attackerKey = pendingOpts.attackerPlayer || (duelState.pendingAction && duelState.pendingAction.attackerPlayer) || 'player1';
    const defenderKey = attackerKey === 'player1' ? 'player2' : 'player1';

    const p1 = duelState[attackerKey];
    const p2 = duelState[defenderKey];
    const attacker = (p1 && p1.monsters) ? p1.monsters[attackerSlot] : null;
    const manifest = getRoomManifest(roomId);

    if (!attacker || attacker.position !== 'ATK') {
        console.log(`[OCG BATTLE] El atacante ya no es válido para continuar el ataque.`);
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return;
    }

    const attackerCardId = Number(attacker.card_id || (attacker.card_data ? (attacker.card_data.id || attacker.card_data.card_id) : 0));
    const attackerAtk = attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.card_data ? attacker.card_data.atk : (attacker.atk || 0));
    const defender = (p2 && p2.monsters && targetSlot !== undefined && targetSlot >= 0) ? p2.monsters[targetSlot] : null;

    // Chequeo de Mensajero de la Paz
    const isMessengerActive = [...(p1.spells || []), ...(p2.spells || [])].some(s => {
        if (!s || s.faceDown || s.position === 'SET') return false;
        const meta = manifest ? manifest.get(s.card_id || (s.card_data ? s.card_data.id : 0)) : null;
        return Boolean(meta?.isMessengerOfPeace);
    });
    if (isMessengerActive && attackerAtk >= 1500) {
        emitDuelLog(roomId, `🕊️ [Mensajero de la Paz] ¡Ataque cancelado! Monstruos con 1500+ ATK no pueden atacar mientras Mensajero de la Paz esté activo.`, 'battle');
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        return;
    }

    const attackerMeta = manifest ? manifest.get(attackerCardId) : null;
    if (attackerMeta && attackerMeta.module && typeof attackerMeta.module.onDeclareAttack === 'function') {
        attackerMeta.module.onDeclareAttack({ duelState, roomId, player: p1, attacker, emitDuelLog });
    } else if (attackerMeta && attackerMeta.isToon) {
        p1.lp = Math.max(0, (p1.lp || 8000) - 500);
        emitDuelLog(roomId, `🎨🏰 [Monstruo Toon] ${p1.username} paga 500 LP como costo obligatorio para declarar ataque con su Toon. (LP: ${p1.lp})`, 'battle');
    }

    const isProtected = pendingOpts.kuribohProtected || duelState.kuribohShieldActive;
    if (duelState.kuribohShieldActive) duelState.kuribohShieldActive = false;

    const currentTurn = duelState.turnNumber || 1;
    const lingeringList = duelState.turnLingeringEffects || [];
    const activeLingeringEffects = lingeringList.filter(e => e.targetPlayer === defenderKey && (e.activeTurn === currentTurn || !e.activeTurn));

    const isBattleDamagePrevented = Boolean(
        isProtected ||
        activeLingeringEffects.some(e => e.preventsBattleDamage) ||
        (duelState.wabokuActivePlayers && duelState.wabokuActivePlayers[defenderKey] && duelState.wabokuActiveTurn === currentTurn) ||
        (duelState.wabokuActivePlayer === defenderKey && duelState.wabokuActiveTurn === currentTurn) ||
        (p2 && p2.wabokuActiveTurn === currentTurn)
    );

    const isBattleDestructionPrevented = Boolean(
        activeLingeringEffects.some(e => e.preventsBattleDestruction) ||
        (duelState.wabokuActivePlayers && duelState.wabokuActivePlayers[defenderKey] && duelState.wabokuActiveTurn === currentTurn) ||
        (duelState.wabokuActivePlayer === defenderKey && duelState.wabokuActiveTurn === currentTurn) ||
        (p2 && p2.wabokuActiveTurn === currentTurn) ||
        (defender && (defender.isBattleProtectedTurn === currentTurn || defender.isBattleProtectedThisTurn))
    );

    const triggerDamageEffects = (dmg) => {
        if (dmg > 0 && !isBattleDamagePrevented) {
            if (attackerMeta && attackerMeta.module && typeof attackerMeta.module.onInflictBattleDamage === 'function') {
                attackerMeta.module.onInflictBattleDamage({ duelState, roomId, player: p1, opponent: p2, dmg, defenderKey, emitDuelLog });
            }
            (p1.spells || []).forEach(s => {
                if (s && !s.faceDown && s.position !== 'SET') {
                    const sMeta = manifest ? manifest.get(s.card_id || (s.card_data ? s.card_data.id : 0)) : null;
                    if (sMeta && sMeta.module && typeof sMeta.module.onInflictBattleDamage === 'function') {
                        sMeta.module.onInflictBattleDamage({ duelState, roomId, player: p1, opponent: p2, dmg, defenderKey, emitDuelLog });
                    }
                }
            });
        }
    };

    if (!defender) {
        // Daño directo
        const dmg = isBattleDamagePrevented ? 0 : attackerAtk;
        p2.lp = Math.max(0, p2.lp - dmg);
        attacker.hasAttacked = true;
        if (isProtected) {
            emitDuelLog(roomId, `🛡️ ¡El daño directo de ${attacker.card_data ? attacker.card_data.name : 'Monstruo'} fue reducido a 0 por Kuriboh!`, 'battle');
        } else if (isBattleDamagePrevented) {
            emitDuelLog(roomId, `🕊️🛡️ ¡El daño directo fue reducido a 0 por un efecto protector activo!`, 'battle');
        } else {
            emitDuelLog(roomId, `⚔️💥 ¡Ataque Directo! ${attacker.card_data ? attacker.card_data.name : 'Monstruo'} asesta ${attackerAtk} puntos de daño directo a ${p2.username}. (LP Rival: ${p2.lp})`, 'battle');
            triggerDamageEffects(dmg);
        }
    } else {
        // Batalla monstruo vs monstruo
        let effectiveAttackerAtk = attackerAtk;
        const defenderCardId = Number(defender.card_id || (defender.card_data ? defender.card_data.id : 0));

        const defenderMeta = manifest ? manifest.get(defenderCardId) : null;
        if (defenderMeta && (defenderMeta.name.toLowerCase().includes('sanga') || defenderMeta.name.toLowerCase().includes('kazejin') || defenderMeta.name.toLowerCase().includes('suijin')) && !defender.usedGuardEffect && !defender.faceDown) {
            defender.usedGuardEffect = true;
            effectiveAttackerAtk = 0;
            const guardName = defender.card_data ? defender.card_data.name : defenderMeta.name;
            emitDuelLog(roomId, `⚡🌊🌪️ [${guardName}] ¡Activa su efecto de defensa! ¡El ATK de ${attacker.card_data ? attacker.card_data.name : 'Atacante'} se reduce a 0 en esta batalla!`, 'effect');
        }

        const defAtk = defender.currentAtk !== undefined ? defender.currentAtk : ((defender.card_data && defender.card_data.atk) || 0);
        const defDef = defender.currentDef !== undefined ? defender.currentDef : ((defender.card_data && defender.card_data.def) || 0);

        if (defender.position === 'ATK') {
            const diff = effectiveAttackerAtk - defAtk;
            if (diff > 0) {
                const defCopy = { ...defender };
                if (!isBattleDestructionPrevented) {
                    sendCardToGraveyard(duelState, defender, defenderKey);
                    p2.monsters[targetSlot] = null;
                    cleanupOrphanedEquipCards(duelState);
                }
                const dmg = isBattleDamagePrevented ? 0 : diff;
                p2.lp = Math.max(0, p2.lp - dmg);
                const destroyMsg = isBattleDestructionPrevented ? ' (Protegido de destrucción por efecto protector)' : '';
                emitDuelLog(roomId, `⚔️💥 ${attacker.card_data ? attacker.card_data.name : 'Atacante'} ataca a ${defender.card_data ? defender.card_data.name : 'Defensor'} en combate! ${p2.username} recibe ${dmg} de daño${destroyMsg}. (LP: ${p2.lp})`, 'battle');
                triggerDamageEffects(dmg);
                if (!isBattleDestructionPrevented) await checkBattleDestroyedTriggers(roomId, duelState, defCopy, defenderKey);
            } else if (diff < 0) {
                const atkCopy = { ...attacker };
                sendCardToGraveyard(duelState, attacker, attackerKey);
                p1.monsters[attackerSlot] = null;
                cleanupOrphanedEquipCards(duelState);
                const recoil = isProtected ? 0 : Math.abs(diff);
                p1.lp = Math.max(0, p1.lp - recoil);
                emitDuelLog(roomId, `⚔️💥 ¡Contragolpe! ${attacker.card_data ? attacker.card_data.name : 'Atacante'} es destruido por ${defender.card_data ? defender.card_data.name : 'Defensor'}. ${p1.username} recibe ${recoil} de daño. (LP: ${p1.lp})`, 'battle');
                await checkBattleDestroyedTriggers(roomId, duelState, atkCopy, attackerKey);
            } else {
                const atkCopy = { ...attacker };
                const defCopy = { ...defender };
                sendCardToGraveyard(duelState, attacker, attackerKey);
                p1.monsters[attackerSlot] = null;
                if (!isBattleDestructionPrevented) {
                    sendCardToGraveyard(duelState, defender, defenderKey);
                    p2.monsters[targetSlot] = null;
                }
                cleanupOrphanedEquipCards(duelState);
                emitDuelLog(roomId, `⚔️💥 ¡Doble K.O.! Ambos monstruos ${attacker.card_data ? attacker.card_data.name : 'Atacante'} y ${defender.card_data ? defender.card_data.name : 'Defensor'} se atacan.`, 'battle');
                await checkBattleDestroyedTriggers(roomId, duelState, atkCopy, attackerKey);
                if (!isBattleDestructionPrevented) await checkBattleDestroyedTriggers(roomId, duelState, defCopy, defenderKey);
            }
        } else {
            // Defender en DEF
            const wasFaceDown = defender.faceDown;
            defender.faceDown = false;

            // Ejecutar efecto de Volteo si el monstruo estaba boca abajo
            if (wasFaceDown && defender.card_data) {
                const isFlip = checkIsFlipMonster(defender);
                if (isFlip) {
                    emitDuelLog(roomId, `⚡ [Efecto de Volteo] ¡${defender.card_data.name} activa su efecto de Volteo al ser atacado!`, 'effect');
                    duelState.pendingAction = { type: 'ATTACK', attackerPlayer: attackerKey, attackerSlot: attackerSlot };
                    await executeCardEffect(roomId, defender.card_data, defenderKey, attackerKey, {
                        slot_index: attackerSlot,
                        target_slot: attackerSlot,
                        target_player: attackerKey
                    });
                    duelState.pendingAction = null;
                }
            }

            // Si el atacante fue destruido o devuelto a la mano por el volteo, abortar daño de batalla
            if (!p1.monsters[attackerSlot]) {
                emitDuelLog(roomId, `⚔️ El atacante fue removido del campo por el efecto de volteo.`, 'battle');
            } else if (effectiveAttackerAtk > defDef) {
                const defCopy = { ...defender };
                if (!isBattleDestructionPrevented) {
                    sendCardToGraveyard(duelState, defender, defenderKey);
                    p2.monsters[targetSlot] = null;
                    cleanupOrphanedEquipCards(duelState);
                }
                const destroyMsg = isBattleDestructionPrevented ? ' (Protegido por efecto protector)' : '';
                emitDuelLog(roomId, `⚔️🛡️ ${attacker.card_data ? attacker.card_data.name : 'Atacante'} ataca la defensa de ${defender.card_data ? defender.card_data.name : 'Defensor'}${destroyMsg}.`, 'battle');
                if (!isBattleDestructionPrevented) await checkBattleDestroyedTriggers(roomId, duelState, defCopy, defenderKey);
            } else if (defDef > effectiveAttackerAtk) {
                const recoil = isProtected ? 0 : (defDef - effectiveAttackerAtk);
                p1.lp = Math.max(0, p1.lp - recoil);
                emitDuelLog(roomId, `⚔️🛡️ ¡Defensa inquebrantable! ${defender.card_data ? defender.card_data.name : 'Defensor'} resiste el ataque. ${p1.username} recibe ${recoil} de daño reflejado.`, 'battle');
            } else {
                emitDuelLog(roomId, `⚔️🛡️ Ataque empatado contra la defensa de ${defender.card_data ? defender.card_data.name : 'Defensor'}. Ningún monstruo es destruido.`, 'battle');
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
    checkIsFlipMonster,
    executeCardEffect,
    resolveActiveChain,
    promptChainWindow,
    proceedWithAttackExecution,
    setNpcTurnExecutor
};
