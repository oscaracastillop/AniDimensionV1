/**
 * Ani-Dimension: Controlador de Acciones de Duelo (Invocaciones, Fases, Batalla)
 */
const {
    duelRooms,
    getIo,
    emitDuelLog,
    createInitialDuelState,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver,
    checkTributesNeeded,
    processDuelGameOver,
    recalculateAllFieldMonstersStats,
    getRoomManifest
} = require('./duel-state');

const { fetchCardData } = require('../data/cards.data');
const { ocgCardReader } = require('../data/sql-card-reader');

const {
    checkIsFlipMonster,
    executeCardEffect,
    promptChainWindow,
    proceedWithAttackExecution
} = require('./ocg-engine');
const { getCardEffect, hasCardEffect } = require('./card-registry');

const {
    executeNpcTurn,
    finalizeTurnHandoffToRival
} = require('./npc-ai');

const OFFICIAL_PHASES = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];

function isDragonMonster(m, duelState = null) {
    if (!m) return false;
    const cd = m.card_data || m;
    const cId = Number(m.card_id || m.id || cd.id || cd.card_id || 0);
    const raceCode = Number(cd.raceCode || m.raceCode || 0);
    if ((raceCode & 0x2000) !== 0) return true; // RACE_DRAGON = 0x2000
    const race = (cd.race || m.race || '').toString().toLowerCase();
    const type = (cd.type || m.type || '').toString().toLowerCase();
    const name = (cd.name || m.name || '').toString().toLowerCase();
    if (race.includes('dragon') || race.includes('dragón')) return true;
    if (type.includes('dragon') || type.includes('dragón')) return true;
    if (name.includes('dragon') || name.includes('dragón')) return true;
    const manifest = getRoomManifest(duelState?.roomId);
    const meta = manifest ? manifest.get(cId) : null;
    return Boolean(meta?.isDragon);
}

function isDragonJarActiveOnField(duelState) {
    if (!duelState) return false;
    const manifest = getRoomManifest(duelState.roomId);
    const p1Spells = (duelState.player1 && duelState.player1.spells) || [];
    const p2Spells = (duelState.player2 && duelState.player2.spells) || [];
    return [...p1Spells, ...p2Spells].some(s => {
        if (!s || s.faceDown || s.position === 'SET') return false;
        const cId = Number(s.card_id || s.id || (s.card_data ? (s.card_data.id || s.card_data.card_id) : 0));
        const meta = manifest ? manifest.get(cId) : null;
        return Boolean(meta?.isDragonTrap);
    });
}

function isFusionMonster(card, duelState = null) {
    if (!card) return false;
    const cd = card.card_data || card;
    const typeStr = (typeof cd.type === 'string' ? cd.type : (typeof cd.card_type === 'string' ? cd.card_type : '')).toLowerCase();
    const typeCode = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
    if (typeStr.includes('fusion') || typeStr.includes('fusión') || Boolean(typeCode & 0x40)) return true;
    const manifest = getRoomManifest(duelState?.roomId);
    const cId = Number(card.card_id || card.id || cd.id || 0);
    const meta = manifest ? manifest.get(cId) : null;
    return Boolean(meta?.isFusion);
}

function isSynchroMonster(card, duelState = null) {
    if (!card) return false;
    const cd = card.card_data || card;
    const typeStr = (typeof cd.type === 'string' ? cd.type : (typeof cd.card_type === 'string' ? cd.card_type : '')).toLowerCase();
    const typeCode = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
    if (typeStr.includes('synchro') || typeStr.includes('sincron') || Boolean(typeCode & 0x2000)) return true;
    const manifest = getRoomManifest(duelState?.roomId);
    const cId = Number(card.card_id || card.id || cd.id || 0);
    const meta = manifest ? manifest.get(cId) : null;
    return Boolean(meta?.isSynchro);
}

function isTunerMonster(card, duelState = null) {
    if (!card) return false;
    const cd = card.card_data || card;
    const typeStr = (typeof cd.type === 'string' ? cd.type : (typeof cd.card_type === 'string' ? cd.card_type : '')).toLowerCase();
    const typeCode = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
    if (typeStr.includes('tuner') || typeStr.includes('cantante') || Boolean(typeCode & 0x1000)) return true;
    const manifest = getRoomManifest(duelState?.roomId);
    const cId = Number(card.card_id || card.id || cd.id || 0);
    const meta = manifest ? manifest.get(cId) : null;
    return Boolean(meta?.isTuner);
}

function isFusionGateActiveOnField(duelState) {
    if (!duelState) return false;
    const manifest = getRoomManifest(duelState.roomId);
    const p1Fs = duelState.player1 && duelState.player1.fieldSpell ? (duelState.player1.fieldSpell.card_id || duelState.player1.fieldSpell.id || (duelState.player1.fieldSpell.card_data && duelState.player1.fieldSpell.card_data.id)) : 0;
    const p2Fs = duelState.player2 && duelState.player2.fieldSpell ? (duelState.player2.fieldSpell.card_id || duelState.player2.fieldSpell.id || (duelState.player2.fieldSpell.card_data && duelState.player2.fieldSpell.card_data.id)) : 0;
    const m1 = manifest ? manifest.get(p1Fs) : null;
    const m2 = manifest ? manifest.get(p2Fs) : null;
    return Boolean(m1?.isFusionGate || m2?.isFusionGate);
}

function triggerOnSummonHooks(duelState, summonedCardData, summonType = 'NORMAL', actingKey = 'player1') {
    if (!duelState || !summonedCardData) return;
    const manifest = getRoomManifest(duelState.roomId);
    const cardId = Number(summonedCardData.id || summonedCardData.card_id || 0);
    const cardMeta = manifest ? manifest.get(cardId) : null;
    const isSixSamurai = Boolean(cardMeta?.isSixSamurai) || (summonedCardData.name || '').toLowerCase().includes('six samurai') || (summonedCardData.name || '').toLowerCase().includes('seis samur');

    // Revisar cartas mágicas y trampas continuas en el campo de ambos jugadores
    ['player1', 'player2'].forEach(pKey => {
        const pObj = duelState[pKey];
        if (pObj && pObj.spells) {
            pObj.spells.forEach(s => {
                if (s && !s.faceDown && s.position !== 'SET') {
                    const sId = Number(s.card_id || (s.card_data && s.card_data.id) || 0);
                    const sMeta = manifest ? manifest.get(sId) : null;
                    if (sMeta && sMeta.module && typeof sMeta.module.onMonsterSummoned === 'function') {
                        sMeta.module.onMonsterSummoned({ duelState, playerKey: pKey, summonedMeta: cardMeta, summonType, spellSlot: s });
                    } else if (isSixSamurai && (sMeta?.name?.toLowerCase().includes('six samurai') || sMeta?.name?.toLowerCase().includes('gateway') || sMeta?.name?.toLowerCase().includes('shien') || sMeta?.name?.toLowerCase().includes('scroll'))) {
                        s.bushidoCounters = (s.bushidoCounters || 0) + 1;
                        emitDuelLog(duelState.roomId, `🏯 [${sMeta.name}] ¡Coloca 1 Contador Bushido! (Total en carta: ${s.bushidoCounters})`, 'spell');
                    }
                }
            });
        }
        if (pObj && pObj.fieldSpell) {
            const fs = pObj.fieldSpell;
            if (fs && !fs.faceDown && fs.position !== 'SET') {
                const fsId = Number(fs.card_id || (fs.card_data && fs.card_data.id) || 0);
                const fsMeta = manifest ? manifest.get(fsId) : null;
                if (fsMeta && fsMeta.module && typeof fsMeta.module.onMonsterSummoned === 'function') {
                    fsMeta.module.onMonsterSummoned({ duelState, playerKey: pKey, summonedMeta: cardMeta, summonType, spellSlot: fs });
                } else if (isSixSamurai && (fsMeta?.name?.toLowerCase().includes('temple') || fsMeta?.name?.toLowerCase().includes('templo') || fsMeta?.name?.toLowerCase().includes('six samurai') || fsMeta?.name?.toLowerCase().includes('seis samur'))) {
                    fs.bushidoCounters = (fs.bushidoCounters || 0) + 1;
                    emitDuelLog(duelState.roomId, `🏯 [${fsMeta?.name || 'Templo'}] ¡Coloca 1 Contador Bushido! (Total en carta: ${fs.bushidoCounters})`, 'spell');
                    recalculateAllFieldMonstersStats(duelState);
                }
            }
        }
    });

    // Ejecutar trigger modular al ser invocado
    if (cardMeta && cardMeta.module && typeof cardMeta.module.onSummon === 'function') {
        const pObj = duelState[actingKey];
        const monster = pObj && pObj.monsters ? pObj.monsters.find(m => m && Number(m.card_id || (m.card_data && m.card_data.id)) === cardId) : null;
        const { effectUtils } = require('./card-registry');
        cardMeta.module.onSummon({ duelState, playerKey: actingKey, monster, summonType, effectUtils });
    }
}

function triggerOnSpellActivationHooks(duelState, spellCardData, actingKey = 'player1') {
    if (!duelState || !spellCardData) return;
    const manifest = getRoomManifest(duelState.roomId);
    ['player1', 'player2'].forEach(pKey => {
        const pObj = duelState[pKey];
        if (pObj && pObj.monsters) {
            pObj.monsters.forEach(m => {
                if (m && !m.faceDown) {
                    const mId = Number(m.card_id || (m.card_data && m.card_data.id) || 0);
                    const mMeta = manifest ? manifest.get(mId) : null;
                    if (mMeta && mMeta.module && typeof mMeta.module.onSpellActivated === 'function') {
                        const { effectUtils } = require('./card-registry');
                        mMeta.module.onSpellActivated({ duelState, monster: m, effectUtils });
                    } else if (mMeta && (mMeta.name?.toLowerCase().includes('skilled') || mMeta.name?.toLowerCase().includes('experto'))) {
                        m.spellCounters = Math.min(3, (m.spellCounters || 0) + 1);
                        emitDuelLog(duelState.roomId, `🔮 [${mMeta.name}] ¡Acumula 1 Contador Mágico por activación de Magia! (Total: ${m.spellCounters}/3)`, 'spell');
                    }
                }
            });
        }
        if (pObj && pObj.fieldSpell) {
            const fsId = Number(pObj.fieldSpell.card_id || (pObj.fieldSpell.card_data && pObj.fieldSpell.card_data.id) || 0);
            const fsMeta = manifest ? manifest.get(fsId) : null;
            if (fsMeta && fsMeta.module && typeof fsMeta.module.onSpellActivated === 'function') {
                const { effectUtils } = require('./card-registry');
                fsMeta.module.onSpellActivated({ duelState, fieldSlot: pObj.fieldSpell, effectUtils });
            } else if (fsMeta && (fsMeta.name?.toLowerCase().includes('endymion') || fsMeta.name?.toLowerCase().includes('citadel'))) {
                pObj.fieldSpell.spellCounters = (pObj.fieldSpell.spellCounters || 0) + 1;
                emitDuelLog(duelState.roomId, `🏰 [${fsMeta.name}] ¡Acumula 1 Contador Mágico! (Total: ${pObj.fieldSpell.spellCounters})`, 'spell');
            }
        }
    });
}

async function handleDuelAction(socket, data) {
    if (!data) return;

    const roomId = data.room_id || socket.currentDuelRoomId || socket.currentPvpRoomId || 'ROOM_DEMO';
    try {
        const actionType = data.action_type || 'SUMMON';
        let slotIndex = data.slot_index !== undefined ? parseInt(data.slot_index, 10) : 0;
        const cardId = parseInt(data.card_id || 0, 10);
        const targetPosition = data.position || 'ATK';

        let duelState = duelRooms.get(roomId);
        if (!duelState) {
            if (actionType === 'SURRENDER' || (roomId && (roomId.startsWith('PVP_') || roomId.startsWith('TOURNAMENT_') || roomId.startsWith('ROOM_PVP')))) {
                if (actionType !== 'SURRENDER') {
                    console.warn(`[DUEL ACTION] Descartando acción: estado de sala PvP ${roomId} aún no activo o reconectando.`);
                }
                return;
            }
            duelState = createInitialDuelState(roomId, socket.user.username, 'NPC Yugi Muto', socket.user.sleeve);
            duelRooms.set(roomId, duelState);
        }

        // Determinar qué jugador realiza la acción (Player 1 o Player 2 en PvP)
        const callerName = String(
            data.player_name || 
            (socket.user && socket.user.username && socket.user.username !== 'Invitado' ? socket.user.username : '') || 
            duelState.player1.username
        ).trim();

        const isPlayer2 = Boolean(
            duelState.player2 && 
            duelState.player2.username && 
            callerName.toLowerCase() === duelState.player2.username.toLowerCase()
        );
        const actingKey = isPlayer2 ? 'player2' : 'player1';
        const rivalKey = isPlayer2 ? 'player1' : 'player2';

        const p1 = duelState[actingKey];
        const p2 = duelState[rivalKey];
        let zoneType = data.zone_type || (data.slot_type === 'SPELL' ? 'P_S' : null);
        if (!zoneType) {
            const tempCard = ocgCardReader(cardId);
            const isSpellOrTrap = tempCard && (tempCard.type?.includes('Spell') || tempCard.type?.includes('Trap') || (tempCard.typeCode & 0x6) !== 0);
            zoneType = isSpellOrTrap ? 'P_S' : 'P_M';
        }

        const isTurnPlayer = (state, p) => {
            if (!state || !p) return false;
            const stateTurnLower = String(state.turnPlayer || '').trim().toLowerCase();
            const pNameLower = String(p.username || '').trim().toLowerCase();
            if (stateTurnLower && pNameLower && stateTurnLower === pNameLower) return true;
            
            // En duelos contra NPC, player1 es SIEMPRE el jugador humano
            const isNpcDuel = Boolean(state.player2 && (state.player2.npcId || state.player2.isNpc || String(state.player2.username).toLowerCase().includes('npc') || String(state.player2.username).toLowerCase().includes('nv.')));
            if (isNpcDuel && actingKey === 'player1') {
                const npcNameLower = String(state.player2.username || '').trim().toLowerCase();
                if (npcNameLower && stateTurnLower !== npcNameLower) return true;
                if (!stateTurnLower && state.turnNumber % 2 === 1 && state.firstPlayer === 'player1') return true;
            }
            return false;
        };

        // =====================================================================
        // INVOCACIÓN ESPECIAL MODULAR (SPECIAL_SUMMON & SPECIAL_SUMMON_GATE_GUARDIAN)
        // =====================================================================
        if (actionType === 'SPECIAL_SUMMON' || actionType === 'SPECIAL_SUMMON_GATE_GUARDIAN') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No es tu turno para invocar.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Solo puedes realizar Invocaciones Especiales durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }

            const effCardId = cardId || (p1.hand && p1.hand[slotIndex] ? (p1.hand[slotIndex].id || p1.hand[slotIndex].card_id) : 0);
            const cardData = ocgCardReader(effCardId) || await fetchCardData(effCardId);
            const isMonster = cardData.type && cardData.type.includes('Monster');
            if (!isMonster) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ Solo los monstruos pueden invocarse de Modo Especial.' });
            }

            // Buscar casilla libre de monstruo
            let freeSlot = slotIndex;
            if (freeSlot < 0 || freeSlot >= 5 || p1.monsters[freeSlot] !== null) {
                freeSlot = p1.monsters.findIndex(m => m === null);
            }
            if (freeSlot === -1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No tienes casillas de monstruo libres en tu campo.' });
            }

            const numCardId = Number(effCardId);
            const manifest = getRoomManifest(duelState.roomId);
            const cardMeta = manifest ? manifest.get(numCardId) : null;
            const cardModule = cardMeta ? cardMeta.module : null;
            const { effectUtils } = require('./card-registry');

            let canDoSpecial = false;
            let specialMsg = `⚔️✨ [Invocación Especial] ¡${p1.username} invoca de Modo Especial a ${cardData.name}!`;

            if (cardModule && typeof cardModule.canSpecialSummon === 'function') {
                const check = cardModule.canSpecialSummon({ duelState, playerKey: actingKey, handIndex: slotIndex });
                if (!check || !check.canSummon) {
                    return socket.emit('ACTION_ERROR', {
                        message: check?.reason || `⚠️ [Regla Oficial] "${cardData.name}" no cumple las condiciones para ser Invocado de Modo Especial.`
                    });
                }
                if (typeof cardModule.executeSpecialSummon === 'function') {
                    cardModule.executeSpecialSummon({ duelState, playerKey: actingKey, effectUtils });
                }
                canDoSpecial = true;
            } else if (cardMeta?.canSpecialSummonSelf || cardData.canSpecialSummonSelf) {
                canDoSpecial = true;
            } else {
                // Validación de condiciones reglamentarias inherentes OCG
                const desc = (cardData.desc || cardData.description || '').toLowerCase();
                const myMonsters = p1.monsters.filter(m => m !== null);
                const rivalMonsters = p2.monsters.filter(m => m !== null);
                const myGy = p1.graveyard || [];

                // 1. Elder of the Six Samurai (61737116) / Cyber Dragon (70095154) / The Fiend Megacyber
                if (numCardId === 61737116 || numCardId === 70095154 || desc.includes('opponent controls a monster and you control no monsters') || desc.includes('adversario controla un monstruo y tú no controlas ninguno')) {
                    if (rivalMonsters.length >= 1 && myMonsters.length === 0) {
                        canDoSpecial = true;
                        specialMsg = numCardId === 61737116 
                            ? `⚔️🌸 [Seis Samuráis] ¡${p1.username} invoca de Modo Especial a Anciano de los Seis Samuráis!` 
                            : `⚔️⚡ [Ciber Dragón] ¡${p1.username} invoca de Modo Especial a Ciber Dragón!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Condición No Cumplida] "${cardData.name}" solo puede Invocarse de Modo Especial si tu rival controla al menos 1 monstruo y tú no controlas ninguno (Rival: ${rivalMonsters.length}, Tú: ${myMonsters.length}).`
                        });
                    }
                }
                // 2. Great Shogun Shien (63176202): 2 o más Seis Samuráis en tu campo
                else if (numCardId === 63176202 || (desc.includes('six samurai') && (desc.includes('control 2 or more') || desc.includes('controlas 2 o más')))) {
                    const sixSamCount = myMonsters.filter(m => {
                        const mName = (m.card_data?.name || '').toLowerCase();
                        return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown;
                    }).length;
                    if (sixSamCount >= 2) {
                        canDoSpecial = true;
                        specialMsg = `⚔️🔥 [Gran Shogun Shien] ¡${p1.username} lidera a los Seis Samuráis e invoca de Modo Especial al Gran Shogun Shien!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Condición No Cumplida] "${cardData.name}" requiere controlar 2 o más monstruos "Seis Samuráis" boca arriba en el campo (actuales: ${sixSamCount}).`
                        });
                    }
                }
                // 3. Grandmaster of the Six Samurai (83039727 / 83039729): 1 o más Seis Samuráis y no controlar otro Gran Maestro
                else if (numCardId === 83039727 || numCardId === 83039729) {
                    const hasSixSam = myMonsters.some(m => {
                        const mName = (m.card_data?.name || '').toLowerCase();
                        return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown;
                    });
                    const alreadyHasGrandmaster = myMonsters.some(m => Number(m.card_id || m.card_data?.id) === 83039727 || Number(m.card_id || m.card_data?.id) === 83039729);
                    if (hasSixSam && !alreadyHasGrandmaster) {
                        canDoSpecial = true;
                        specialMsg = `⚔️🏯 [Gran Maestro] ¡${p1.username} invoca de Modo Especial a Gran Maestro de los Seis Samuráis!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: alreadyHasGrandmaster
                                ? `⚠️ [Regla Oficial] Solo puedes controlar 1 "Gran Maestro de los Seis Samuráis" boca arriba a la vez.`
                                : `⚠️ [Condición No Cumplida] "Gran Maestro de los Seis Samuráis" requiere controlar al menos 1 monstruo "Seis Samuráis" boca arriba en el campo.`
                        });
                    }
                }
                // 4. Legendary Six Samurai - Kizan (49721904): Otro Seis Samurái boca arriba con nombre distinto
                else if (numCardId === 49721904) {
                    const hasOtherSixSam = myMonsters.some(m => {
                        const mName = (m.card_data?.name || '').toLowerCase();
                        return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown && Number(m.card_id || m.card_data?.id) !== 49721904;
                    });
                    if (hasOtherSixSam) {
                        canDoSpecial = true;
                        specialMsg = `⚔️⚡ [Kizan] ¡${p1.username} invoca de Modo Especial a Seis Samuráis Legendarios - Kizan!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Condición No Cumplida] "Seis Samuráis Legendarios - Kizan" requiere controlar otro monstruo "Seis Samuráis" boca arriba.`
                        });
                    }
                }
                // 5. Monstruos Caos (BLS 72989439 / Chaos Sorcerer 99188141): Desterrar 1 LUZ + 1 OSCURIDAD del Cementerio
                else if ([72989439, 99188141].includes(numCardId)) {
                    const lightIdx = myGy.findIndex(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'LIGHT');
                    const darkIdx = myGy.findIndex(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK');
                    if (lightIdx !== -1 && darkIdx !== -1 && lightIdx !== darkIdx) {
                        const firstIdx = Math.max(lightIdx, darkIdx);
                        const secIdx = Math.min(lightIdx, darkIdx);
                        const c1 = myGy.splice(firstIdx, 1)[0];
                        const c2 = myGy.splice(secIdx, 1)[0];
                        p1.banished.push(c1, c2);
                        canDoSpecial = true;
                        specialMsg = `🌌✨ [Invocación Caos] ¡${p1.username} destierra 1 LUZ y 1 OSCURIDAD del Cementerio e invoca a ${cardData.name}!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Condición No Cumplida] "${cardData.name}" requiere desterrar 1 monstruo LUZ y 1 OSCURIDAD de tu Cementerio.`
                        });
                    }
                }
                // 6. Dragón Armado Oscuro (65192027): Exactamente 3 monstruos OSCURIDAD en el Cementerio
                else if (numCardId === 65192027) {
                    const darkCount = myGy.filter(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK').length;
                    if (darkCount === 3) {
                        canDoSpecial = true;
                        specialMsg = `🐉✨ [Dragón Armado Oscuro] ¡${p1.username} invoca de Modo Especial a Dragón Armado Oscuro!`;
                    } else {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Condición No Cumplida] "Dragón Armado Oscuro" requiere exactamente 3 monstruos de OSCURIDAD en tu Cementerio (actuales: ${darkCount}).`
                        });
                    }
                }
                // 7. Genéricos con texto de Invocación Especial inherente o tipo Efecto
                else if (desc.includes('special summon this card') || desc.includes('invocar esta carta de modo especial') || desc.includes('special summon') || desc.includes('invocación especial')) {
                    canDoSpecial = true;
                } else {
                    canDoSpecial = true;
                }
            }

            emitDuelLog(roomId, specialMsg, 'summon');

            p1.monsters[freeSlot] = {
                card_id: cardId,
                position: targetPosition || 'ATK',
                faceDown: false,
                hasAttacked: false,
                turnSummoned: duelState.turnNumber,
                hasChangedPosition: false,
                originalOwner: actingKey,
                card_data: { ...cardData, id: cardId, card_id: cardId, originalOwner: actingKey }
            };
            calculateMonsterCurrentStats(p1.monsters[freeSlot], duelState);

            // Quitar de la mano
            const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
            if (hIdx !== -1) p1.hand.splice(hIdx, 1);

            triggerOnSummonHooks(duelState, cardData, 'SPECIAL', actingKey);

            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            promptChainWindow(roomId, `${p1.username} invocó de Modo Especial a ${cardData.name}`, cardData, p2.username);
            return;
        }

        // =====================================================================
        // 1. INVOCACIÓN NORMAL DE MONSTRUO (SUMMON) CON SISTEMA DE TRIBUTOS OCG
        // =====================================================================
        if (actionType === 'SUMMON') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Solo puedes realizar Invocaciones Normales durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (duelState.normalSummonUsed) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Ya has realizado tu Invocación Normal / Colocación de este turno (límite 1 por turno).' 
                });
            }

            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isMonster = cardData.type && cardData.type.includes('Monster');

            if (!isMonster) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa no pueden invocarse como Monstruos. Debes colocarlas en la Zona de Magias/Trampas.' 
                });
            }

            if (zoneType === 'P_S') {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Los monstruos solo pueden invocarse en la Zona de Monstruos (Fila Central).' 
                });
            }

            if (slotIndex < 0 || slotIndex >= 5) {
                return socket.emit('ACTION_ERROR', { message: 'Casilla de monstruo inválida (debe ser de 0 a 4).' });
            }

            // REGLAMENTO DE SACRIFICIOS (TRIBUTOS) OCG:
            const tributesNeeded = checkTributesNeeded(cardData.level || 0, cardData.id || cardData.card_id);

            // Si no requiere sacrificios (Nivel 1-4), la casilla debe estar vacía directamente
            if (tributesNeeded === 0 && p1.monsters[slotIndex] !== null) {
                return socket.emit('ACTION_ERROR', { message: `La casilla de monstruo #${slotIndex + 1} ya está ocupada.` });
            }
            const monstersOnField = p1.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);

            if (monstersOnField.length < tributesNeeded) {
                return socket.emit('ACTION_ERROR', {
                    message: `⚠️ [Regla Oficial Konami] ${cardData.name} es Nivel ${cardData.level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente controlas ${monstersOnField.length}.`
                });
            }

            // Si requiere tributos y aún no se especificaron: Consultar "A la Inversa" al cliente
            if (tributesNeeded > 0 && (!data.tribute_slots || data.tribute_slots.length < tributesNeeded)) {
                console.log(`[OCG TRIBUTE PROMPT] Solicitando selección de ${tributesNeeded} sacrificio(s) al cliente...`);
                return socket.emit('OCG_PROMPT_TRIBUTE', {
                    card_id: cardId,
                    card_name: cardData.name,
                    level: cardData.level,
                    required_count: tributesNeeded,
                    target_slot: slotIndex,
                    position: targetPosition,
                    available_slots: monstersOnField
                });
            }

            // Si se suministraron tributos, validarlos estrictamente y enviarlos al Cementerio
            if (tributesNeeded > 0) {
                const validTributes = (data.tribute_slots || []).filter(tSlot => tSlot >= 0 && tSlot < 5 && p1.monsters[tSlot] !== null);
                if (validTributes.length < tributesNeeded) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial] ${cardData.name} requiere ${tributesNeeded} sacrificio(s). No puedes seleccionar casillas vacías; debes tributar monstruos reales que controles en tu campo.`
                    });
                }

                validTributes.slice(0, tributesNeeded).forEach(tSlot => {
                    const sacrificedMonster = p1.monsters[tSlot];
                    sendCardToGraveyard(duelState, sacrificedMonster, actingKey);
                    p1.monsters[tSlot] = null;
                });
                // Si la casilla elegida sigue ocupada tras el sacrificio, ubicar en la primera casilla recién sacrificada
                if (p1.monsters[slotIndex] !== null) {
                    slotIndex = validTributes[0];
                }
                emitDuelLog(roomId, `⭐ [Invocación por Sacrificio] ${p1.username} tributó ${tributesNeeded} monstruo(s) en su campo para invocar a ${cardData.name}!`, 'tribute');
            } else {
                emitDuelLog(roomId, `⚔️ [Invocación Normal] ${p1.username} invoca a ${cardData.name} en Modo Ataque en casilla #${slotIndex + 1}.`, 'summon');
            }

            const isDragon = isDragonMonster(cardData);
            const isDragonJarActive = isDragonJarActiveOnField(duelState);
            let finalPos = targetPosition || 'ATK';
            let isFaceDown = (targetPosition === 'DEF');
            if (isDragonJarActive && isDragon && finalPos === 'ATK') {
                finalPos = 'DEF';
                isFaceDown = false;
                emitDuelLog(roomId, `🏺 [Jarra de Captura de Dragones] ¡"${cardData.name}" fue forzado a Posición de Defensa por el efecto continuo de la Jarra!`, 'trap');
            }

            p1.monsters[slotIndex] = {
                card_id: cardId,
                position: finalPos,
                faceDown: isFaceDown,
                hasAttacked: false,
                turnSummoned: duelState.turnNumber,
                hasChangedPosition: false,
                originalOwner: actingKey,
                card_data: { ...cardData, originalOwner: actingKey }
            };
            duelState.normalSummonUsed = true;
            calculateMonsterCurrentStats(p1.monsters[slotIndex], duelState);

            // Quitar de la mano
            const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
            if (hIdx !== -1) p1.hand.splice(hIdx, 1);

            triggerOnSummonHooks(duelState, cardData, 'NORMAL', actingKey);

            duelState.pendingAction = {
                type: 'SUMMON',
                summonType: 'NORMAL',
                player: actingKey,
                slot_index: slotIndex,
                cardData
            };

            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            // Ventana de interrupción al oponente
            promptChainWindow(roomId, `${p1.username} invocó a ${cardData.name}`, cardData, p2.username);
        }

        // =====================================================================
        // 2. COLOCAR EN DEFENSA O MAGIA/TRAMPA BOCA ABAJO (SET / DEF_SUMMON)
        // =====================================================================
        else if (actionType === 'SET' || actionType === 'DEF_SUMMON') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Solo puedes colocar cartas durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isMonster = cardData.type && cardData.type.includes('Monster');

            if (isMonster) {
                if (duelState.normalSummonUsed) {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial] Ya has realizado tu Invocación Normal / Colocación de este turno (límite 1 por turno).' 
                    });
                }
                if (zoneType === 'P_S') {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial] Los monstruos no pueden colocarse en la Zona de Magias/Trampas.' 
                    });
                }
                if (slotIndex < 0 || slotIndex >= 5) return socket.emit('ACTION_ERROR', { message: 'Casilla de monstruo inválida.' });

                // Regla de tributos en colocación
                const tributesNeeded = checkTributesNeeded(cardData.level || 0, cardData.id || cardData.card_id);

                if (tributesNeeded === 0 && p1.monsters[slotIndex] !== null) {
                    return socket.emit('ACTION_ERROR', { message: `Casilla de monstruo #${slotIndex + 1} ocupada.` });
                }

                const monstersOnField = p1.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);

                if (monstersOnField.length < tributesNeeded) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial Konami] ${cardData.name} (Nv. ${cardData.level}) requiere ${tributesNeeded} sacrificio(s) en el campo para ser colocado. Actualmente controlas ${monstersOnField.length}.`
                    });
                }

                if (tributesNeeded > 0 && (!data.tribute_slots || data.tribute_slots.length < tributesNeeded)) {
                    return socket.emit('OCG_PROMPT_TRIBUTE', {
                        card_id: cardId,
                        card_name: cardData.name,
                        level: cardData.level,
                        required_count: tributesNeeded,
                        target_slot: slotIndex,
                        position: 'DEF',
                        available_slots: monstersOnField
                    });
                }

                if (tributesNeeded > 0) {
                    const validTributes = (data.tribute_slots || []).filter(tSlot => tSlot >= 0 && tSlot < 5 && p1.monsters[tSlot] !== null);
                    if (validTributes.length < tributesNeeded) {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Regla Oficial] ${cardData.name} requiere ${tributesNeeded} sacrificio(s). Debes seleccionar monstruos reales que controles en tu campo.`
                        });
                    }
                    validTributes.slice(0, tributesNeeded).forEach(tSlot => {
                        const sacrificedMonster = p1.monsters[tSlot];
                        sendCardToGraveyard(duelState, sacrificedMonster, actingKey);
                        p1.monsters[tSlot] = null;
                    });
                    if (p1.monsters[slotIndex] !== null) {
                        slotIndex = validTributes[0];
                    }
                }

                p1.monsters[slotIndex] = {
                    card_id: cardId,
                    position: 'DEF',
                    faceDown: true,
                    hasAttacked: false,
                    turnSummoned: duelState.turnNumber,
                    hasChangedPosition: false,
                    originalOwner: actingKey,
                    card_data: { ...cardData, originalOwner: actingKey }
                };
                duelState.normalSummonUsed = true;
                calculateMonsterCurrentStats(p1.monsters[slotIndex], duelState);
                emitDuelLog(roomId, `🛡️ ${p1.username} colocó un monstruo boca abajo en Posición de Defensa (DEF) en casilla #${slotIndex + 1}.`, 'set');

                const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
                if (hIdx !== -1) p1.hand.splice(hIdx, 1);

                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                return;
            } else if (zoneType === 'P_CAMPO' || (cardData.race === 'Field') || (cardData.type && cardData.type.includes('Field')) || (cardData.typeCode && (cardData.typeCode & 0x80000))) {
                if (p1.fieldSpell) {
                    sendCardToGraveyard(duelState, p1.fieldSpell, actingKey);
                    p1.fieldSpell = null;
                }
                p1.fieldSpell = {
                    card_id: cardId,
                    position: 'SET',
                    faceDown: true,
                    turnSet: duelState.turnNumber,
                    card_data: cardData
                };
                emitDuelLog(roomId, `🌌 ${p1.username} colocó una Carta de Campo boca abajo en la Zona de Campo.`, 'set');
            } else {
                // Magia o Trampa SET
                if (zoneType === 'P_M') {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa deben colocarse en la Zona de Magias y Trampas (Fila Inferior).' 
                    });
                }
                if (slotIndex < 0 || slotIndex >= 5) return socket.emit('ACTION_ERROR', { message: 'Casilla de Magia/Trampa inválida.' });
                if (p1.spells[slotIndex] !== null) return socket.emit('ACTION_ERROR', { message: `Casilla mágica #${slotIndex + 1} ocupada.` });

                p1.spells[slotIndex] = {
                    card_id: cardId,
                    position: 'SET',
                    faceDown: true,
                    turnSet: duelState.turnNumber,
                    card_data: cardData
                };
                emitDuelLog(roomId, `🎴 ${p1.username} colocó una carta boca abajo en la Zona de Magias/Trampas #${slotIndex + 1}.`, 'set');
            }

            const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
            if (hIdx !== -1) p1.hand.splice(hIdx, 1);
        }

        // =====================================================================
        // 2.5 CONSULTA DINÁMICA DE ACCIONES DISPONIBLES (GET_CARD_ACTIONS)
        // =====================================================================
        else if (actionType === 'GET_CARD_ACTIONS') {
            const location = data.location || 'HAND';
            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isMonster = (cardData.type && (cardData.type.includes('Monster') || cardData.type.includes('Spellcaster'))) || (cardData.typeCode && (cardData.typeCode & 0x01) !== 0);
            const isSpell = !isMonster && ((cardData.type && cardData.type.includes('Spell') && !cardData.type.includes('Spellcaster')) || (cardData.typeCode && (cardData.typeCode & 0x02) !== 0));
            const isTrap = !isMonster && ((cardData.type && cardData.type.includes('Trap')) || (cardData.typeCode && (cardData.typeCode & 0x04) !== 0));
            
            const actions = [];
            if (location === 'HAND') {
                if (isMonster) actions.push('SUMMON', 'SET');
                if (isSpell) actions.push('ACTIVATE', 'SET');
                if (isTrap) actions.push('SET');
            }
            return socket.emit('CARD_ACTIONS_RESULT', {
                cardId: cardId,
                slotIndex: slotIndex,
                location: location,
                actions: actions
            });
        }

        // =====================================================================
        // 3. ACTIVACIÓN DIRECTA DE MAGIA O TRAMPA (ACTIVATE / CLIENT_ACTIVATE)
        // =====================================================================
        else if (actionType === 'ACTIVATE' || actionType === 'CLIENT_ACTIVATE') {
            const manifest = getRoomManifest(duelState);
            const cardMeta = manifest.get(cardId);
            const cardData = cardMeta.data || ocgCardReader(cardId) || await fetchCardData(cardId);
            const isField = cardMeta.isField;
            const isTrap = cardMeta.isTrap;
            const isQuickPlay = cardMeta.isQuickPlay;
            const isMonster = cardMeta.isMonster;
            const isHandEffect = cardMeta.isHandEffect && (data.from_hand || data.location === 'HAND');
            const isEquip = cardMeta.isEquip;
            const isSpell = cardMeta.isSpell;

            // REGLA OFICIAL OCG: Validación de compatibilidad con script Lua para cartas de equipo
            if (isEquip) {
                if (!data.target_data || (data.target_data.slot_index === undefined && data.target_data.target_slot === undefined)) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial] Debes seleccionar un monstruo objetivo para equipar "${cardData.name}".`
                    });
                }
                const targetSlot = (data.target_data.target_slot !== undefined) ? data.target_data.target_slot : data.target_data.slot_index;
                const tPlayerKey = data.target_data.target_player || actingKey;
                const tPlayer = duelState[tPlayerKey];
                const targetMonster = tPlayer && tPlayer.monsters[targetSlot];
                if (!targetMonster) {
                    return socket.emit('ACTION_ERROR', {
                        message: '⚠️ [Regla Oficial] No hay un monstruo en la casilla seleccionada para equipar.'
                    });
                }
                if (targetMonster.faceDown) {
                    return socket.emit('ACTION_ERROR', {
                        message: '⚠️ [Regla Oficial] Las cartas de equipo solo pueden equiparse a monstruos boca arriba.'
                    });
                }
                const effectMod = getCardEffect(cardId);
                if (effectMod && typeof effectMod.canEquip === 'function') {
                    const check = effectMod.canEquip(targetMonster.card_data || targetMonster);
                    if (!check) {
                        const reqMsg = effectMod.requiredRace ? ` de Tipo ${effectMod.requiredRace.toUpperCase()}` : '';
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Core Dimension] "${cardData.name}" sólo puede equiparse a monstruos${reqMsg}, no a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}".`
                        });
                    }
                }
            }

            // REGLA OFICIAL OCG: Durante el turno del rival solo se permiten Trampas, Mágicas de Juego Rápido y Efectos Rápidos de Mano (Kuriboh)
            if (!isTurnPlayer(duelState, p1) && !isTrap && !isQuickPlay && !isHandEffect) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG] Solo puedes activar Cartas de Trampa, Mágicas de Juego Rápido o Efectos de Mano Rápidos durante el turno del rival.' 
                });
            }

            // REGLA OFICIAL OCG: Durante la Battle Phase solo se permiten Cartas de Trampa y Mágicas de Juego Rápido (Velocidad 2+)
            if (duelState.phase === 'BATTLE' && !isTrap && !isQuickPlay && !isHandEffect) {
                return socket.emit('ACTION_ERROR', {
                    message: `⚠️ [Regla Oficial OCG] Durante la Battle Phase no puedes activar cartas Mágicas normales, de equipo ni continuas ("${cardData.name}" es de Velocidad 1).`
                });
            }

            // Verificación de cartas boca arriba en campo
            if (slotIndex !== undefined && slotIndex >= 0 && p1.spells[slotIndex]) {
                const sCard = p1.spells[slotIndex];
                const cd = sCard.card_data || ocgCardReader(sCard.card_id) || {};
                const isContinuousOrField = isField || (cd.type && (cd.type.includes('Continuous') || cd.type.includes('Field'))) || (cd.race && (cd.race.includes('Continuous') || cd.race.includes('Field'))) || (sCard.counters && sCard.counters > 0);

                if (!data.from_hand && (!sCard.faceDown && sCard.position !== 'SET') && !isContinuousOrField) {
                    return socket.emit('ACTION_ERROR', { 
                        message: `⚠️ [Regla Oficial] "${sCard.card_data ? sCard.card_data.name : 'Esta carta'}" ya fue activada y se encuentra activa en el campo.` 
                    });
                }
                // REGLA OFICIAL OCG: Una trampa no puede activarse en el mismo turno en que fue colocada
                if (isTrap && sCard.turnSet === duelState.turnNumber && isTurnPlayer(duelState, p1)) {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial OCG] Las cartas de Trampa no pueden activarse en el mismo turno en que fueron colocadas.' 
                    });
                }
            }

            // REGLA OFICIAL OCG: Las trampas no se activan directamente de la mano (deben colocarse previamente)
            if (isTrap && (data.from_hand || (!p1.spells[slotIndex] && !p1.spells.some(s => s && s.card_id === cardId)))) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG] Las cartas de Trampa no pueden activarse directamente desde la mano. Debes colocarlas (SET) previamente en el campo.' 
                });
            }

            // REGLA OFICIAL OCG: Trampas reactivas a Invocaciones o Ataques solo en su ventana correspondiente
            if (isTrap) {
                const isSummonTrap = cardMeta.isSummonTrap;
                const isAttackTrap = cardMeta.isAttackTrap;
                if (isSummonTrap && !duelState.chainWindowActive && (!duelState.activeChain || duelState.activeChain.length === 0)) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial Konami] "${cardData.name}" solo puede activarse en respuesta a la Invocación de un monstruo.`
                    });
                }
                if (isAttackTrap && (!duelState.pendingAction || duelState.pendingAction.type !== 'ATTACK')) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial Konami] "${cardData.name}" solo puede activarse cuando un monstruo del adversario declara un ataque.`
                    });
                }
            }

            // Verificación modular canActivate reglamentaria
            const cardMod = getCardEffect(cardId);
            if (cardMod && typeof cardMod.canActivate === 'function') {
                const check = cardMod.canActivate({ duelState, playerKey: actingKey, opponentKey: rivalKey });
                if (check && check.canActivate === false) {
                    return socket.emit('ACTION_ERROR', {
                        message: check.reason || `⚠️ No se cumplen las condiciones para activar "${cardData.name}".`
                    });
                }
            }

            if (isHandEffect) {
                if (!cardMeta.isHandEffect) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Core Dimension] "${cardData.name}" no tiene un efecto que pueda activarse desde la mano. Debe ser invocado o colocado boca abajo (SET) en el campo.`
                    });
                }

                // Hand Trap / Efecto de Mano: Descartar de la mano y abrir cadena
                const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
                let discardedCard = null;
                if (hIdx !== -1) {
                    [discardedCard] = p1.hand.splice(hIdx, 1);
                    sendCardToGraveyard(duelState, discardedCard || cardData, actingKey);
                }

                const nextLink = duelState.activeChain.length + 1;
                duelState.activeChain.push({
                    chainLink: nextLink,
                    player: p1.username,
                    card_id: cardId,
                    card_data: cardData,
                    from_hand: true,
                    is_monster_effect: true,
                    target_data: data.target_data || null
                });

                emitDuelLog(roomId, `⚡ [Cadena Eslabón ${nextLink}] ¡${p1.username} activa el efecto desde la mano de "${cardData.name}"!`, 'chain');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                promptChainWindow(roomId, `${p1.username} activó efecto de mano ${cardData.name}`, cardData, p2.username);
                return;
            }

            if (isField) {
                // Si la carta ya estaba colocada boca abajo en el campo
                if (p1.fieldSpell && (Number(p1.fieldSpell.card_id) === Number(cardId) || p1.fieldSpell.faceDown) && !data.from_hand) {
                    p1.fieldSpell.faceDown = false;
                    p1.fieldSpell.position = 'ACT';
                } else {
                    // Si ya existe otra Carta de Campo DIFERENTE activa, enviarla al Cementerio según la Regla Oficial Konami
                    if (p1.fieldSpell && Number(p1.fieldSpell.card_id) !== Number(cardId)) {
                        sendCardToGraveyard(duelState, p1.fieldSpell, actingKey);
                        p1.fieldSpell = null;
                    }
                    // Colocar en casilla de Campo Mágico y abrir cadena
                    p1.fieldSpell = { card_id: cardId, card_data: cardData, position: 'ACT', faceDown: false };
                    const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
                    if (hIdx !== -1) p1.hand.splice(hIdx, 1);
                }
                recalculateAllFieldMonstersStats(duelState);

                duelState.activeChain.push({
                    chainLink: 1,
                    player: p1.username,
                    card_id: cardId,
                    card_data: cardData,
                    target_data: data.target_data || null
                });

                emitDuelLog(roomId, `🌌 [Cadena Eslabón 1] ${p1.username} activa el Campo Mágico "${cardData.name}"!`, 'chain');
                triggerOnSpellActivationHooks(duelState, cardData, actingKey);
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                promptChainWindow(roomId, `${p1.username} activó Campo Mágico ${cardData.name}`, cardData, p2.username);
                return;
            }

            // Verificar si se activa desde la mano o desde el campo
            let fromField = false;
            let targetSlotUsed = slotIndex;

            const isFromHand = data.from_hand === true || data.from_hand === 'true' || 
                (p1.hand.some(c => Number(c.id || c.card_id) === Number(cardId)) && (!p1.spells[slotIndex] || Number(p1.spells[slotIndex].card_id) !== Number(cardId)));

            if (isFromHand) {
                // Desde la mano: colocar temporalmente en casilla libre
                targetSlotUsed = p1.spells.findIndex(s => s === null);
                if (targetSlotUsed === -1) {
                    return socket.emit('ACTION_ERROR', { message: 'No tienes casillas de Magias/Trampas libres para activar esta carta.' });
                }
                const hIdx = p1.hand.findIndex(c => Number(c.id || c.card_id) === Number(cardId));
                if (hIdx !== -1) p1.hand.splice(hIdx, 1);
                
                p1.spells[targetSlotUsed] = {
                    card_id: cardId,
                    position: 'ACT',
                    faceDown: false,
                    card_data: cardData
                };
            } else {
                fromField = true;
                if (p1.spells[slotIndex]) {
                    p1.spells[slotIndex].faceDown = false;
                    p1.spells[slotIndex].position = 'ACT';
                }
            }

            // Iniciar o agregar a la Cadena Oficial
            const nextLink = duelState.activeChain.length + 1;
            duelState.activeChain.push({
                chainLink: nextLink,
                player: p1.username,
                card_id: cardId,
                card_data: cardData,
                slot_index: targetSlotUsed,
                from_hand: isFromHand,
                target_data: data.target_data || null
            });

            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${nextLink}] ${p1.username} activa "${cardData.name}"!`, 'chain');
            if (isSpell) {
                triggerOnSpellActivationHooks(duelState, cardData, actingKey);
            }
            enrichDuelStateForBroadcast(duelState);

            // Preguntar al rival si desea encadenar
            promptChainWindow(roomId, `${p1.username} activó ${cardData.name}`, cardData, p2.username);
            return;
        }

        // =====================================================================
        // 3.5 ACTIVACIÓN DE EFECTO DE MONSTRUO (MONSTER_EFFECT)
        // =====================================================================
        else if (actionType === 'MONSTER_EFFECT') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Solo puedes activar efectos de ignición durante tu propio turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Los efectos de monstruo de ignición solo se pueden activar durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (slotIndex < 0 || slotIndex >= 5 || !p1.monsters[slotIndex]) {
                return socket.emit('ACTION_ERROR', { message: 'No hay un monstruo en esa casilla.' });
            }

            const monster = p1.monsters[slotIndex];
            if (monster.faceDown) {
                return socket.emit('ACTION_ERROR', { message: 'Un monstruo boca abajo no puede activar sus efectos de ignición.' });
            }
            if (monster.hasUsedEffect) {
                return socket.emit('ACTION_ERROR', { message: `⚠️ [Regla Oficial] El efecto de "${monster.card_data.name}" solo puede usarse una vez por turno.` });
            }
            if (monster.isTrapped) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo está atrapado por un efecto continuo y no puede activar sus efectos.' });
            }

            monster.hasUsedEffect = true;

            const nextLink = duelState.activeChain.length + 1;
            duelState.activeChain.push({
                chainLink: nextLink,
                player: p1.username,
                card_id: monster.card_id,
                card_data: monster.card_data,
                slot_index: slotIndex,
                is_monster_effect: true,
                target_data: data.target_data || null
            });

            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${nextLink}] ¡${p1.username} activa el efecto de "${monster.card_data.name}"!`, 'chain');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            promptChainWindow(roomId, `${p1.username} activó efecto de ${monster.card_data.name}`, monster.card_data, p2.username);
            return;
        }

        // =====================================================================
        // 3.6 INVOCACIÓN POR FUSIÓN (FUSION_SUMMON / POLIMERIZACIÓN / FUSION GATE / CONTACT FUSION)
        // =====================================================================
        else if (actionType === 'FUSION_SUMMON') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Solo puedes realizar Invocaciones por Fusión durante tu turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Las Invocaciones por Fusión solo se pueden realizar durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }

            const fusionCardId = data.fusion_card_id ? parseInt(data.fusion_card_id, 10) : 0;
            const materials = data.materials || [];

            if (!fusionCardId) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ Debes seleccionar un Monstruo de Fusión válido del Extra Deck.' });
            }

            const extraIdx = (p1.extraDeck || []).findIndex(c => (c.id || c.card_id) === fusionCardId);
            if (extraIdx === -1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ El Monstruo de Fusión seleccionado no se encuentra en tu Extra Deck.' });
            }

            const fusionMonsterData = ocgCardReader(fusionCardId) || p1.extraDeck[extraIdx];

            if (!isFusionMonster(fusionMonsterData, duelState)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ La carta seleccionada no es un Monstruo de Fusión.' });
            }

            if (!materials || materials.length < 2) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ Una Invocación por Fusión requiere al menos 2 monstruos de material.' });
            }

            const manifest = getRoomManifest(duelState);
            const fMeta = manifest ? manifest.get(fusionCardId) : null;
            const isContactFusion = Boolean(fMeta?.isContactFusion) || data.contact_fusion === true;
            const isFusionGate = isFusionGateActiveOnField(duelState) || data.fusion_type === 'FUSION_GATE';

            if (isContactFusion) {
                const nonFieldMat = materials.find(m => m.location !== 'FIELD');
                if (nonFieldMat) {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Invocación Especial por Contacto] Todos los monstruos de material requeridos deben estar en tu CAMPO para desterrarlos.' 
                    });
                }
            }

            const materialNames = [];
            const removedHandIndices = [];
            const clearedFieldSlots = [];

            for (const mat of materials) {
                const matId = parseInt(mat.card_id, 10);
                const matData = ocgCardReader(matId) || mat;
                materialNames.push(matData.name || 'Monstruo');

                if (mat.location === 'HAND') {
                    const hIdx = p1.hand.findIndex((c, idx) => Number(c.id || c.card_id) === Number(matId) && !removedHandIndices.includes(idx));
                    if (hIdx === -1) {
                        return socket.emit('ACTION_ERROR', { message: `⚠️ No se encontró el material "${matData.name}" en tu mano.` });
                    }
                    removedHandIndices.push(hIdx);
                } else if (mat.location === 'FIELD') {
                    const fSlot = parseInt(mat.slot_index, 10);
                    if (fSlot < 0 || fSlot >= 5 || !p1.monsters[fSlot] || (Number(p1.monsters[fSlot].card_id) !== Number(matId) && Number(p1.monsters[fSlot].card_data?.id) !== Number(matId))) {
                        return socket.emit('ACTION_ERROR', { message: `⚠️ No se encontró el material "${matData.name}" en la casilla #${fSlot + 1} del campo.` });
                    }
                    clearedFieldSlots.push(fSlot);
                }
            }

            clearedFieldSlots.forEach(slot => {
                const monsterOnField = p1.monsters[slot];
                if (monsterOnField) {
                    if (isContactFusion || isFusionGate) {
                        sendCardToBanished(duelState, monsterOnField, actingKey);
                    } else {
                        sendCardToGraveyard(duelState, monsterOnField, actingKey);
                    }
                    p1.monsters[slot] = null;
                }
            });

            removedHandIndices.sort((a, b) => b - a).forEach(idx => {
                const handCard = p1.hand.splice(idx, 1)[0];
                if (handCard) {
                    if (isFusionGate) {
                        sendCardToBanished(duelState, handCard, actingKey);
                    } else {
                        sendCardToGraveyard(duelState, handCard, actingKey);
                    }
                }
            });

            // Si es Fusión estándar (sin Contacto y sin Fusion Gate), consumir Polimerización
            if (!isContactFusion && !isFusionGate) {
                const polyHandIdx = p1.hand.findIndex(c => {
                    const cMeta = manifest ? manifest.get(c.id || c.card_id) : null;
                    return Boolean(cMeta?.isPolymerization);
                });
                if (polyHandIdx !== -1) {
                    const polyCard = p1.hand.splice(polyHandIdx, 1)[0];
                    sendCardToGraveyard(duelState, polyCard, actingKey);
                } else {
                    const polySpellIdx = p1.spells.findIndex(s => {
                        if (!s) return false;
                        const sMeta = manifest ? manifest.get(s.card_id || (s.card_data && s.card_data.id)) : null;
                        return Boolean(sMeta?.isPolymerization);
                    });
                    if (polySpellIdx !== -1) {
                        const polyCard = p1.spells[polySpellIdx];
                        p1.spells[polySpellIdx] = null;
                        sendCardToGraveyard(duelState, polyCard, actingKey);
                    } else {
                        return socket.emit('ACTION_ERROR', { 
                            message: '⚠️ [Invocación por Fusión] Para realizar una Invocación por Fusión requieres tener y activar "Polimerización" o tener activo el campo "Fusion Gate".' 
                        });
                    }
                }
            }

            p1.extraDeck.splice(extraIdx, 1);
            p1.extraDeckCount = p1.extraDeck.length;

            const summonSlot = p1.monsters.findIndex(m => m === null);
            if (summonSlot === -1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ No hay casillas libres para invocar al Monstruo de Fusión.' });
            }

            const isDragon = isDragonMonster(fusionMonsterData);
            const isDragonJarActive = isDragonJarActiveOnField(duelState);
            let fusionPos = 'ATK';
            if (isDragonJarActive && isDragon) {
                fusionPos = 'DEF';
                emitDuelLog(roomId, `🏺 [Jarra de Captura de Dragones] ¡"${fusionMonsterData.name}" fue forzado a Posición de Defensa por el efecto continuo de la Jarra!`, 'trap');
            }

            p1.monsters[summonSlot] = {
                card_id: fusionCardId,
                position: fusionPos,
                faceDown: false,
                hasAttacked: false,
                turnSummoned: duelState.turnNumber,
                hasChangedPosition: false,
                originalOwner: actingKey,
                card_data: { ...fusionMonsterData, id: fusionCardId, card_id: fusionCardId, originalOwner: actingKey }
            };
            calculateMonsterCurrentStats(p1.monsters[summonSlot], duelState);

            const methodTitle = isContactFusion 
                ? '⚡⭐ [Invocación Especial por Contacto]' 
                : (isFusionGate ? '🌀🌌 [Invocación por Fusión - Fusion Gate]' : '🌀⭐ [Invocación por Fusión]');
            emitDuelLog(roomId, `${methodTitle} ¡${p1.username} ${isContactFusion || isFusionGate ? 'desterró' : 'envió al Cementerio'} a ${materialNames.join(' + ')} para invocar a "${fusionMonsterData.name}"!`, 'summon');
            triggerOnSummonHooks(duelState, fusionMonsterData, 'SPECIAL', actingKey);
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            promptChainWindow(roomId, `${p1.username} invocó a ${fusionMonsterData.name}`, fusionMonsterData, p2.username);
            return;
        }

        // =====================================================================
        // 3.7 INVOCACIÓN POR SINCRONÍA (SYNCHRO_SUMMON - 5D's REGLAMENTO OFICIAL)
        // =====================================================================
        else if (actionType === 'SYNCHRO_SUMMON') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Solo puedes realizar Invocaciones por Sincronía durante tu turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Las Invocaciones por Sincronía solo se pueden realizar durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }

            const synchroCardId = data.synchro_card_id ? parseInt(data.synchro_card_id, 10) : 0;
            const materialSlots = data.material_slots || []; // Array of slot indices on field e.g. [0, 2]

            if (!synchroCardId) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ Debes seleccionar un Monstruo de Sincronía válido del Extra Deck.' });
            }

            const extraIdx = (p1.extraDeck || []).findIndex(c => (c.id || c.card_id) === synchroCardId);
            if (extraIdx === -1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ El Monstruo de Sincronía seleccionado no se encuentra en tu Extra Deck.' });
            }

            const synchroMonsterData = ocgCardReader(synchroCardId) || p1.extraDeck[extraIdx];

            if (!isSynchroMonster(synchroMonsterData, duelState)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ La carta seleccionada no es un Monstruo de Sincronía.' });
            }

            const targetLevel = synchroMonsterData.level || 0;

            if (!materialSlots || materialSlots.length < 2) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ Una Invocación por Sincronía requiere al menos 1 Monstruo Cantante (Tuner) y 1 o más Monstruos No-Cantantes en el campo.' });
            }

            const sMeta = manifest ? manifest.get(synchroCardId) : null;
            const synchroModule = (sMeta && sMeta.module) || getCardEffect(synchroCardId);

            // Validar los materiales en el campo
            let tunerCount = 0;
            let nonTunerCount = 0;
            let totalLevel = 0;
            const materialMonsters = [];
            const materialNames = [];

            for (const slot of materialSlots) {
                const fSlot = parseInt(slot, 10);
                if (fSlot < 0 || fSlot >= 5 || !p1.monsters[fSlot]) {
                    return socket.emit('ACTION_ERROR', { message: `⚠️ No se encontró un monstruo válido en la casilla #${fSlot + 1} del campo.` });
                }

                const mon = p1.monsters[fSlot];
                if (mon.faceDown) {
                    return socket.emit('ACTION_ERROR', { message: `⚠️ [Regla Oficial] Todos los materiales de Sincronía deben estar boca arriba en el campo ("${mon.card_data.name}" está boca abajo).` });
                }

                const monData = mon.card_data || ocgCardReader(mon.card_id);
                const isTuner = isTunerMonster(mon, duelState);
                const monLvl = mon.currentLevel !== undefined ? mon.currentLevel : (monData.level || 1);

                if (isTuner) {
                    tunerCount++;
                    if (synchroModule && synchroModule.synchroRequirements && typeof synchroModule.synchroRequirements.tunerFilter === 'function') {
                        if (!synchroModule.synchroRequirements.tunerFilter(mon)) {
                            return socket.emit('ACTION_ERROR', { message: `⚠️ [Requisitos de Sincronía] "${monData.name}" no cumple los requisitos de Cantante específico para "${synchroMonsterData.name}".` });
                        }
                    }
                } else {
                    nonTunerCount++;
                    if (synchroModule && synchroModule.synchroRequirements && typeof synchroModule.synchroRequirements.nonTunerFilter === 'function') {
                        if (!synchroModule.synchroRequirements.nonTunerFilter(mon)) {
                            return socket.emit('ACTION_ERROR', { message: `⚠️ [Requisitos de Sincronía] "${monData.name}" no cumple los requisitos de No-Cantante específico para "${synchroMonsterData.name}".` });
                        }
                    }
                }

                totalLevel += monLvl;
                materialMonsters.push({ slot: fSlot, mon });
                materialNames.push(monData.name || 'Monstruo');
            }

            if (tunerCount < 1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Debes seleccionar al menos 1 Monstruo Cantante (Tuner) para la Sincronía.' });
            }
            if (nonTunerCount < 1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Debes seleccionar al menos 1 Monstruo No-Cantante (No-Tuner) para la Sincronía.' });
            }
            if (totalLevel !== targetLevel) {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Cálculo de Niveles] La suma de niveles de los materiales (${totalLevel}) no coincide exactamente con el Nivel del Monstruo de Sincronía (${synchroMonsterData.name} es Nivel ${targetLevel}).` 
                });
            }

            // Enviar materiales de Sincronía del campo al Cementerio
            for (const { slot, mon } of materialMonsters) {
                sendCardToGraveyard(duelState, mon, actingKey);
                p1.monsters[slot] = null;
            }

            // Retirar monstruo del Extra Deck
            p1.extraDeck.splice(extraIdx, 1);
            p1.extraDeckCount = p1.extraDeck.length;

            // Determinar casilla destino
            let summonSlot = data.slot_index !== undefined ? parseInt(data.slot_index, 10) : -1;
            if (summonSlot < 0 || summonSlot >= 5 || p1.monsters[summonSlot] !== null) {
                summonSlot = p1.monsters.findIndex(m => m === null);
            }

            if (summonSlot === -1) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ No tienes zonas de monstruos disponibles en tu campo.' });
            }

            const rawPos = (data.position || 'ATK').toUpperCase();
            const synchroPos = rawPos.startsWith('DEF') ? 'DEF' : 'ATK';

            p1.monsters[summonSlot] = {
                card_id: synchroCardId,
                position: synchroPos,
                faceDown: false,
                hasAttacked: false,
                turnSummoned: duelState.turnNumber,
                hasChangedPosition: false,
                originalOwner: actingKey,
                card_data: { ...synchroMonsterData, id: synchroCardId, card_id: synchroCardId, originalOwner: actingKey }
            };
            calculateMonsterCurrentStats(p1.monsters[summonSlot], duelState);
            triggerOnSummonHooks(duelState, synchroMonsterData, 'SPECIAL', actingKey);

            emitDuelLog(roomId, `⚡🌠 [Invocación por Sincronía] ¡${p1.username} sintoniza a ${materialNames.join(' + ')} (Niveles = ${targetLevel}) para invocar a "${synchroMonsterData.name}"!`, 'summon');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            promptChainWindow(roomId, `${p1.username} invocó por Sincronía a ${synchroMonsterData.name}`, synchroMonsterData, p2.username);
            return;
        }

        // =====================================================================
        // RENDICIÓN OFICIAL DEL DUELO (SURRENDER)
        // =====================================================================
        else if (actionType === 'SURRENDER') {
            await processDuelGameOver(roomId, duelState, rivalKey, actingKey, 'SURRENDER');
            return;
        }

        // =====================================================================
        // 4. CAMBIO DE POSICIÓN DE BATALLA (CHANGE_POS)
        // =====================================================================
        else if (actionType === 'CHANGE_POS') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial OCG] Solo puedes cambiar la posición de batalla durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (slotIndex >= 0 && slotIndex < 5 && p1.monsters[slotIndex]) {
                const m = p1.monsters[slotIndex];
                if (m.isTrapped) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Este monstruo está atrapado por Círculo Atador de Hechizos y no puede cambiar su posición de batalla.' });
                }
                if (m.turnSummoned === duelState.turnNumber) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] No puedes cambiar la posición de batalla de un monstruo en el mismo turno en que fue invocado o colocado.' });
                }
                if (m.hasAttacked) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Un monstruo que declaró un ataque este turno no puede cambiar su posición de batalla.' });
                }
                if (m.hasChangedPosition) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Cada monstruo solo puede cambiar manualmente su posición de batalla una vez por turno.' });
                }

                const isDragon = isDragonMonster(m);
                const isDragonJarActive = isDragonJarActiveOnField(duelState);
                if (isDragonJarActive && isDragon && (m.position === 'DEF' || m.faceDown)) {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial OCG - Jarra de Captura de Dragones] Los monstruos de Tipo Dragón no pueden cambiar su posición de batalla a Modo de Ataque mientras la Jarra de Captura de Dragones permanezca activa en el campo.' 
                    });
                }

                // Si está en Defensa Boca Abajo -> Flip Summon (Invocación por Volteo) a Ataque Boca Arriba
                if (m.position === 'DEF' && m.faceDown) {
                    m.position = 'ATK';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄⭐ [Invocación por Volteo] ${p1.username} cambia a ${m.card_data.name} a Posición de Ataque boca arriba.`, 'position');

                    duelState.pendingAction = {
                        type: 'FLIP_SUMMON',
                        summonType: 'FLIP',
                        player: actingKey,
                        slot_index: slotIndex,
                        cardData: m.card_data
                    };

                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                    // Ventana de interrupción al oponente
                    promptChainWindow(roomId, `${p1.username} realizó Invocación por Volteo de ${m.card_data.name}`, m.card_data, p2.username);

                    // Ejecutar efecto de Volteo si aplica
                    const isFlip = checkIsFlipMonster(m);
                    if (isFlip && p1.monsters[slotIndex]) {
                        await executeCardEffect(roomId, m.card_data, actingKey, rivalKey, data.target_data || null);
                    }
                } else if (m.position === 'ATK') {
                    // Ataque Boca Arriba -> Defensa Boca Arriba (según regla oficial Konami OCG, nunca se coloca boca abajo manualmente)
                    m.position = 'DEF';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄 ${p1.username} cambió a ${m.card_data.name} a Posición de Defensa boca arriba.`, 'position');
                } else if (m.position === 'DEF' && !m.faceDown) {
                    // Defensa Boca Arriba -> Ataque Boca Arriba
                    m.position = 'ATK';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄 ${p1.username} cambió a ${m.card_data.name} a Posición de Ataque boca arriba.`, 'position');
                }
            }
        }

        // =====================================================================
        // 5. CAMBIO DE FASE REGLAMENTARIA & ROBO (PASS_PHASE / SET_PHASE)
        // =====================================================================
        else if (actionType === 'PASS_PHASE' || actionType === 'SET_PHASE') {
            if (!isTurnPlayer(duelState, p1)) {
                return socket.emit('ACTION_ERROR', { message: 'Solo puedes cambiar de fase durante tu turno.' });
            }

            let nextPhase = data.target_phase;

            if (!nextPhase) {
                if (duelState.turnNumber === 1 && (duelState.phase === 'MAIN_1' || duelState.phase === 'STANDBY' || duelState.phase === 'DRAW')) {
                    if (duelState.phase === 'MAIN_1') nextPhase = 'END';
                    else if (duelState.phase === 'STANDBY') nextPhase = 'MAIN_1';
                    else nextPhase = 'STANDBY';
                } else {
                    let currentIdx = OFFICIAL_PHASES.indexOf(duelState.phase);
                    nextPhase = OFFICIAL_PHASES[(currentIdx + 1) % OFFICIAL_PHASES.length];
                }
            }

            // Validar saltos hacia atrás (regla oficial: fases anteriores quedan deshabilitadas)
            const currentIdx = OFFICIAL_PHASES.indexOf(duelState.phase);
            const targetIdx = OFFICIAL_PHASES.indexOf(nextPhase);
            if (targetIdx !== -1 && targetIdx < currentIdx) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Las fases anteriores ya concluyeron en este turno. No puedes retroceder.' 
                });
            }

            // Regla oficial Konami: El primer jugador NO puede entrar a Battle Phase ni atacar en el Turno 1
            if (nextPhase === 'BATTLE' && duelState.turnNumber === 1) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial Konami] El primer jugador no puede entrar a la Battle Phase ni declarar ataques en el Turno 1.' 
                });
            }

            // Validar reglas oficiales de transición OCG / TCG
            if (duelState.phase === 'MAIN_1' && nextPhase === 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] No puedes entrar a Main Phase 2 sin haber entrado a la Battle Phase.' 
                });
            }

            if (nextPhase === 'END') {
                duelState.phase = 'END';
                emitDuelLog(roomId, `⏱️ Cambio oficial a END PHASE.`, 'phase');

                // Procesar efectos y limpiezas de final de turno en monstruos
                ['player1', 'player2'].forEach(pKey => {
                    const p = duelState[pKey];
                    if (p && p.monsters) {
                        p.monsters.forEach((m, idx) => {
                            if (m && m.destroyAtEndPhase) {
                                emitDuelLog(roomId, `💥 [Efecto Fin de Turno] "${m.card_data ? m.card_data.name : 'Monstruo'}" es destruido en la End Phase.`, 'destroy');
                                p.monsters[idx] = null;
                                sendCardToGraveyard(duelState, m, pKey);
                            }
                            if (m) {
                                m.usedShiEnNegateThisTurn = false;
                                m.hasAttacked = false;
                                m.hasChangedPosition = false;
                            }
                        });
                    }
                });

                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                // Comprobación reglamentaria de límite de mano (Máx 6 cartas)
                if (p1.hand.length > 6) {
                    const excessCount = p1.hand.length - 6;
                    emitDuelLog(roomId, `📦 [Límite de Mano] ${p1.username} debe seleccionar y descartar ${excessCount} carta(s) al Cementerio.`, 'phase');
                    socket.emit('OCG_PROMPT_HAND_DISCARD', {
                        required_count: excessCount,
                        hand: p1.hand
                    });
                    // El traspaso de turno ocurrirá cuando el jugador confirme su descarte
                    return;
                }

                // Si no sobrepasa el límite, ceder turno al rival
                finalizeTurnHandoffToRival(roomId);
                return;
            } else {
                duelState.phase = nextPhase;
                emitDuelLog(roomId, `⏱️ Cambio oficial a ${duelState.phase} PHASE.`, 'phase');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            }
        }

        // =====================================================================
        // 6. DECLARAR ATAQUE Y VENTANA DE CADENAS DE COMBATE (ATTACK)
        // =====================================================================
        else if (actionType === 'ATTACK' || actionType === 'CLIENT_ATTACK') {
            if (duelState.turnNumber === 1) {
                return socket.emit('ACTION_ERROR', {
                    message: '⚠️ [Regla Oficial Konami] No se pueden declarar ataques en el Turno 1 del duelo.'
                });
            }

            if (duelState.phase !== 'BATTLE') {
                return socket.emit('ACTION_ERROR', {
                    message: `⚠️ [Regla Oficial] No puedes atacar en la fase "${duelState.phase}". Pasa primero a la BATTLE PHASE.`
                });
            }

            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
                if (!duelState.chainWindowActive && (!duelState.activeChain || duelState.activeChain.length === 0)) {
                    // Acción previa desactualizada: limpiar automáticamente para no bloquear el juego
                    duelState.pendingAction = null;
                } else {
                    return socket.emit('ACTION_ERROR', { message: 'Ya hay un ataque en proceso de resolución.' });
                }
            }

            const attackerSlot = data.attacker_slot !== undefined ? parseInt(data.attacker_slot, 10) : slotIndex;
            const attacker = p1.monsters[attackerSlot];

            if (!attacker) {
                return socket.emit('ACTION_ERROR', { message: 'No hay ningún monstruo atacante en la casilla seleccionada.' });
            }
            if (attacker.position !== 'ATK') {
                return socket.emit('ACTION_ERROR', { message: 'Un monstruo en Posición de Defensa no puede declarar ataque.' });
            }
            if (attacker.hasAttacked) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo ya ha declarado un ataque en este turno.' });
            }
            const manifest = getRoomManifest(duelState);
            const swordsActive = p2.spells.some(s => {
                if (!s || s.faceDown) return false;
                const mCard = manifest.get(s.card_id || (s.card_data && s.card_data.id));
                return mCard && mCard.isAttackBlocker;
            });
            if (swordsActive) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG] No puedes declarar ataques mientras las Espadas de la Luz Reveladora del oponente permanezcan activas en el campo.' 
                });
            }

            const isDragon = isDragonMonster(attacker);
            const isDragonJarActive = isDragonJarActiveOnField(duelState);
            if (isDragonJarActive && isDragon) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG - Jarra de Captura de Dragones] Los monstruos de Tipo Dragón no pueden declarar ataques mientras la Jarra de Captura de Dragones permanezca activa en el campo.' 
                });
            }

            if (attacker.isTrapped || (attacker.attachedEffects && attacker.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'))) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo está inmovilizado por un efecto continuo (Círculo Atador de Hechizos) y no puede atacar.' });
            }

            const targetSlot = data.target_slot !== undefined ? parseInt(data.target_slot, 10) : -1;
            const hasMonsters = p2.monsters.some(m => m !== null);
            if (hasMonsters && targetSlot === -1) {
                return socket.emit('ACTION_ERROR', { message: 'No puedes atacar directamente mientras el rival tenga monstruos en el campo.' });
            }

            emitDuelLog(roomId, `⚔️ ${p1.username} declara un ataque con ${attacker.card_data.name}!`, 'battle');

            // Guardar acción pendiente de batalla y abrir ventana de interrupción para trampas
            duelState.pendingAction = {
                type: 'ATTACK',
                attackerPlayer: actingKey,
                attackerSlot: attackerSlot,
                targetSlot: targetSlot
            };

            promptChainWindow(roomId, `Ataque declarado por ${attacker.card_data.name}`, attacker.card_data, p2.username);
            return;
        }

        // =====================================================================
        // 6. RENDICIÓN OFICIAL (SURRENDER)
        // =====================================================================
        else if (actionType === 'SURRENDER') {
            const isP1 = (socket.user && socket.user.username === p1.username) || true;
            const winnerKey = isP1 ? 'player2' : 'player1';
            const loserKey = isP1 ? 'player1' : 'player2';

            await processDuelGameOver(roomId, duelState, winnerKey, loserKey, 'SURRENDER');
            return;
        }

        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
    } catch (err) {
        console.error(`[HANDLE_DUEL_ACTION FATAL ERROR in room ${roomId}]`, err);
        const duelState = duelRooms.get(roomId);
        if (duelState) {
            duelState.activeChain = [];
            duelState.chainWindowActive = false;
            try {
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            } catch (e) {
                console.error('[HANDLE_DUEL_ACTION STATE RECOVERY ERROR]', e);
            }
        }
        socket.emit('ACTION_ERROR', { message: err.message || 'Error al procesar la jugada.' });
    }
}

    // =========================================================================
    // RESPUESTAS "A LA INVERSA" DEL CLIENTE (CADENAS, TRIBUTOS, OBJETIVOS)
    // =========================================================================

    

module.exports = {
    handleDuelAction
};
