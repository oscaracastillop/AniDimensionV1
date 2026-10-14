const {
    duelRooms,
    roomChainCallbacks,
    getIo,
    emitDuelLog,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver,
    checkDeckOut
} = require('./duel-state');

const {
    executeCardEffect,
    promptChainWindow,
    proceedWithAttackExecution
} = require('./ocg-engine');
const { ocgCardReader } = require('../data/sql-card-reader');
const { getRoomManifest } = require('./room-manifest');

// =========================================================================
// FUSIÓN Y RITUAL: Gestionados dinámicamente mediante RoomCardManifest y módulos nativos

function isNpcOpponent(player, roomId = '') {
    if (!player) return false;
    if (player.isNpc || player.npcId) return true;
    if (roomId && (roomId.startsWith('NPC_') || roomId.includes('_NPC_') || roomId.includes('ADVENTURE_') || roomId.includes('SOLO_'))) return true;
    const name = (player.username || '').toLowerCase();
    return name.includes('npc') || name.includes('yugi') || name.includes('yami') || name.includes('nv.') || name.includes('kaiba') || name.includes('joey') || name.includes('pegasus') || name.includes('bakura') || name.includes('keith') || name.includes('marik') || name.includes('mai') || name.includes('muto');
}

function isDragonMonster(m, duelState = null) {
    if (!m) return false;
    const cd = m.card_data || m;
    const cId = Number(m.card_id || m.id || cd.id || cd.card_id || 0);
    const raceCode = Number(cd.raceCode || m.raceCode || 0);
    if ((raceCode & 0x2000) !== 0) return true;
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
        const cId = Number(s.card_id || s.id || (s.card_data && s.card_data.id) || 0);
        const meta = manifest ? manifest.get(cId) : null;
        return Boolean(meta?.isDragonTrap);
    });
}

function getCardId(card) {
    if (!card) return 0;
    return Number(card.id || card.card_id || (card.card_data && (card.card_data.id || card.card_data.card_id)) || 0);
}

function promptNpcChainWindowWithSafety(roomId, triggerMessage, activeCardData, reactingPlayerName, maxWaitMs = 6000) {
    return new Promise(resolve => {
        let isResolved = false;
        const cleanup = () => {
            if (!isResolved) {
                isResolved = true;
                if (roomChainCallbacks.get(roomId) === callbackWrapper) {
                    roomChainCallbacks.delete(roomId);
                }
                resolve();
            }
        };

        const callbackWrapper = () => {
            cleanup();
        };

        roomChainCallbacks.set(roomId, callbackWrapper);
        promptChainWindow(roomId, triggerMessage, activeCardData, reactingPlayerName);
        setTimeout(cleanup, maxWaitMs);
    });
}

/**
 * Motor Maestro de Ejecución de Turnos de IA (Lethal Tactical AI)
 */
async function executeNpcTurn(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState || duelState.isGameOver) return;

    // Determinar qué jugador es el NPC en su turno correspondiente
    let npcKey = null;
    if (duelState.turnPlayer && duelState.player1 && duelState.turnPlayer.trim().toLowerCase() === duelState.player1.username.trim().toLowerCase() && isNpcOpponent(duelState.player1, roomId)) {
        npcKey = 'player1';
    } else if (duelState.turnPlayer && duelState.player2 && duelState.turnPlayer.trim().toLowerCase() === duelState.player2.username.trim().toLowerCase() && isNpcOpponent(duelState.player2, roomId)) {
        npcKey = 'player2';
    } else {
        const isP2Npc = isNpcOpponent(duelState.player2, roomId);
        const isP1Npc = isNpcOpponent(duelState.player1, roomId);
        if (isP2Npc && duelState.turnPlayer === duelState.player2.username) npcKey = 'player2';
        else if (isP1Npc && duelState.turnPlayer === duelState.player1.username) npcKey = 'player1';
        else if (isP2Npc) npcKey = 'player2';
        else if (isP1Npc) npcKey = 'player1';
        else return;
    }

    const playerKey = npcKey === 'player2' ? 'player1' : 'player2';
    const npc = duelState[npcKey];
    const player = duelState[playerKey];
    const manifest = getRoomManifest(roomId);

    if (duelState.turnPlayer !== npc.username) return;

    try {
        console.log(`[NPC AI] 🧠 Iniciando Turno Táctico Maestro de ${npc.username} (Turno #${duelState.turnNumber})...`);

        // =====================================================================
        // 1. STANDBY PHASE DEL NPC
        // =====================================================================
        duelState.phase = 'STANDBY';
        emitDuelLog(roomId, `⏱️ [Rival] STANDBY PHASE.`, 'phase');
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        await new Promise(r => setTimeout(r, 600));

        // =====================================================================
        // 2. MAIN PHASE 1 DEL NPC - COMBOS Y SECUENCIAS TÁCTICAS
        // =====================================================================
        duelState.phase = 'MAIN_1';
        emitDuelLog(roomId, `⏱️ [Rival] MAIN PHASE 1.`, 'phase');

        // 2.0 Invocación por Volteo / Cambio de Posición
        for (let i = 0; i < 5; i++) {
            const m = npc.monsters[i];
            if (!m) continue;
            const isDragon = isDragonMonster(m);
            const isDragonJarActive = isDragonJarActiveOnField(duelState);
            if (isDragonJarActive && isDragon) continue;

            if (m.position === 'DEF' && m.turnSummoned !== duelState.turnNumber && !m.hasChangedPosition && !m.isTrapped) {
                const wasFaceDown = m.faceDown;
                m.position = 'ATK';
                m.faceDown = false;
                m.hasChangedPosition = true;
                if (wasFaceDown) {
                    emitDuelLog(roomId, `🔄⭐ [Invocación por Volteo Rival] ${npc.username} cambia a "${m.card_data.name}" a Modo de Ataque!`, 'position');
                    const flipId = getCardId(m);
                    const isFlip = (m.card_data && m.card_data.type && typeof m.card_data.type === 'string' && m.card_data.type.includes('Flip')) 
                        || (m.card_data && (Number(m.card_data.type) & 0x200000)) 
                        || Boolean(manifest?.get(flipId)?.isFlip);
                    if (isFlip) {
                        await executeCardEffect(roomId, m.card_data, npcKey, playerKey);
                    }
                } else {
                    emitDuelLog(roomId, `🔄 [Cambio de Posición Rival] ${npc.username} cambia a "${m.card_data.name}" a Modo de Ataque!`, 'position');
                }
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 400));
            }
        }

        // 2.1 COMBO PASO A: Cartas de Robo y Ventaja (Pot of Greed, Graceful Charity)
        let potIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isDrawCard));
        if (potIdx !== -1 && npc.deck && npc.deck.length >= 2) {
            const potCard = npc.hand.splice(potIdx, 1)[0];
            emitDuelLog(roomId, `🏺✨ [Olla de la Codicia] ¡${npc.username} activa Olla de la Codicia y roba 2 cartas!`, 'spell');
            await executeCardEffect(roomId, potCard, npcKey, playerKey);
            sendCardToGraveyard(duelState, potCard, npcKey);
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 600));
        }

        let charityIdx = -1;
        if (charityIdx !== -1 && npc.deck && npc.deck.length >= 3) {
            const charCard = npc.hand.splice(charityIdx, 1)[0];
            emitDuelLog(roomId, `👼✨ [Caridad Grácil] ¡${npc.username} activa Caridad Grácil!`, 'spell');
            await executeCardEffect(roomId, charCard, npcKey, playerKey);
            sendCardToGraveyard(duelState, charCard, npcKey);
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 600));
        }

        // 2.2 COMBO PASO B: Destrucción de Retaguardia Rival (Plumero, Tormenta, MST)
        const playerHasSpells = player.spells.some(s => s !== null) || player.fieldSpell !== null;
        if (playerHasSpells) {
            // Harpie's Feather Duster / Heavy Storm
            let nukeBackrowIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isSpellTrapBoardWipe));
            if (nukeBackrowIdx !== -1) {
                const nukeCard = npc.hand.splice(nukeBackrowIdx, 1)[0];
                emitDuelLog(roomId, `🌪️✨ ¡${npc.username} activa "${nukeCard.name}" para destruir la retaguardia de ${player.username}!`, 'spell');
                await executeCardEffect(roomId, nukeCard, npcKey, playerKey);
                sendCardToGraveyard(duelState, nukeCard, npcKey);
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            } else {
                // Mystical Space Typhoon / De-Spell
                let mstIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isSpellTrapRemoval));
                if (mstIdx !== -1) {
                    const mstCard = npc.hand.splice(mstIdx, 1)[0];
                    let targetSlot = player.fieldSpell ? 0 : player.spells.findIndex(s => s !== null);
                    let isField = Boolean(player.fieldSpell);
                    emitDuelLog(roomId, `🌀✨ ¡${npc.username} activa "${mstCard.name}" destruyendo una carta mágica/trampa!`, 'spell');
                    await executeCardEffect(roomId, mstCard, npcKey, playerKey, {
                        target_player: playerKey,
                        target_slot: targetSlot,
                        is_field_spell: isField
                    });
                    sendCardToGraveyard(duelState, mstCard, npcKey);
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        // 2.3 COMBO PASO C: Disrupción de Mano Rival (Delinquent Duo, Confiscation, Forceful Sentry)
        let duoIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isHandDisruption));
        if (duoIdx !== -1 && player.hand && player.hand.length >= 2 && npc.lp > 1000) {
            const duoCard = npc.hand.splice(duoIdx, 1)[0];
            emitDuelLog(roomId, `😈✨ [Dúo Delincuente] ¡${npc.username} paga 1000 LP para forzar a ${player.username} a descartar 2 cartas!`, 'spell');
            await executeCardEffect(roomId, duoCard, npcKey, playerKey);
            sendCardToGraveyard(duelState, duoCard, npcKey);
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 600));
        }

        let sentryIdx = -1;
        if (sentryIdx !== -1 && player.hand && player.hand.length > 0) {
            const sentryCard = npc.hand.splice(sentryIdx, 1)[0];
            emitDuelLog(roomId, `👁️✨ ¡${npc.username} activa "${sentryCard.name}" inspeccionando la mano de ${player.username}!`, 'spell');
            await executeCardEffect(roomId, sentryCard, npcKey, playerKey);
            sendCardToGraveyard(duelState, sentryCard, npcKey);
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 600));
        }

        // 2.4 COMBO PASO D: Limpieza de Monstruos Rival (Raigeki, Dark Hole, Smashing Ground, Nobleman, Fissure)
        const playerHasMonsters = player.monsters.some(m => m !== null);
        if (playerHasMonsters) {
            // Raigeki
            let raigekiIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isMonsterBoardWipe));
            if (raigekiIdx !== -1) {
                const rCard = npc.hand.splice(raigekiIdx, 1)[0];
                emitDuelLog(roomId, `⚡💥 [Raigeki] ¡${npc.username} activa Raigeki para fulminar todos los monstruos de ${player.username}!`, 'spell');
                await executeCardEffect(roomId, rCard, npcKey, playerKey);
                sendCardToGraveyard(duelState, rCard, npcKey);
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            } else {
                // Dark Hole si el jugador tiene más monstruos o NPC no tiene monstruos
                const npcMonCount = npc.monsters.filter(m => m !== null).length;
                const playerMonCount = player.monsters.filter(m => m !== null).length;
                let darkHoleIdx = -1;
                if (darkHoleIdx !== -1 && (npcMonCount === 0 || playerMonCount > npcMonCount)) {
                    const dhCard = npc.hand.splice(darkHoleIdx, 1)[0];
                    emitDuelLog(roomId, `🕳️💥 [Agujero Oscuro] ¡${npc.username} desata Agujero Oscuro barriendo el campo de monstruos!`, 'spell');
                    await executeCardEffect(roomId, dhCard, npcKey, playerKey);
                    sendCardToGraveyard(duelState, dhCard, npcKey);
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                } else {
                    // Smashing Ground o Nobleman of Crossout o Fissure
                    let removalIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isMonsterRemoval));
                    if (removalIdx !== -1) {
                        const remCard = npc.hand.splice(removalIdx, 1)[0];
                        emitDuelLog(roomId, `💥✨ ¡${npc.username} activa "${remCard.name}"!`, 'spell');
                        await executeCardEffect(roomId, remCard, npcKey, playerKey);
                        sendCardToGraveyard(duelState, remCard, npcKey);
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                        await new Promise(r => setTimeout(r, 600));
                    }
                }
            }
        }

        // 2.5 COMBO PASO E: Magias de Campo
        if (!npc.fieldSpell) {
            const fieldSpellIdx = npc.hand.findIndex(c => (c.type && c.type.includes('Field')) || (c.race === 'Field'));
            if (fieldSpellIdx !== -1) {
                const fsCard = npc.hand.splice(fieldSpellIdx, 1)[0];
                npc.fieldSpell = { card_id: fsCard.id || fsCard.card_id, card_data: fsCard };
                emitDuelLog(roomId, `🌌 [Campo Mágico Rival] ${npc.username} activa el Campo "${fsCard.name}".`, 'field');
                await executeCardEffect(roomId, fsCard, npcKey, playerKey);
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // 2.6 COMBO PASO F: Robo de Control (Change of Heart / Snatch Steal)
        if (player.monsters.some(m => m !== null) && npc.monsters.some(m => m === null)) {
            let stealIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isControlSteal));
            if (stealIdx !== -1) {
                const sCard = npc.hand.splice(stealIdx, 1)[0];
                let bestTargetSlot = -1;
                let maxAtk = -1;
                for (let i = 0; i < 5; i++) {
                    const pm = player.monsters[i];
                    if (pm) {
                        const atk = pm.currentAtk !== undefined ? pm.currentAtk : (pm.card_data ? pm.card_data.atk : 0);
                        if (atk > maxAtk) {
                            maxAtk = atk;
                            bestTargetSlot = i;
                        }
                    }
                }
                if (bestTargetSlot !== -1) {
                    emitDuelLog(roomId, `💖✨ ¡${npc.username} activa "${sCard.name}" tomando el control de tu monstruo más poderoso!`, 'spell');
                    await executeCardEffect(roomId, sCard, npcKey, playerKey, { slot_index: bestTargetSlot });
                    if (manifest?.get(getCardId(sCard))?.isControlSteal) {
                        sendCardToGraveyard(duelState, sCard, npcKey);
                    }
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        // 2.7 COMBO PASO G: Resurrección de Monstruos (Monster Reborn / Premature Burial)
        if (npc.monsters.some(m => m === null)) {
            let reviveIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isMonsterRevival));
            if (reviveIdx !== -1) {
                const allGraveMonsters = [];
                [npcKey, playerKey].forEach(pk => {
                    const gy = duelState[pk].graveyard || [];
                    gy.forEach(c => {
                        const cData = ocgCardReader(c.id || c.card_id) || c.card_data || c;
                        const tStr = (cData.type || '').toLowerCase();
                        const isMon = !tStr.includes('spell') && !tStr.includes('trap') && (tStr.includes('monster') || (cData.atk !== null && cData.atk !== undefined && cData.atk >= 0));
                        if (isMon) {
                            allGraveMonsters.push({ ...c, source_player: pk, atk: cData.atk || 0, name: cData.name });
                        }
                    });
                });

                if (allGraveMonsters.length > 0) {
                    allGraveMonsters.sort((a, b) => (b.atk || 0) - (a.atk || 0));
                    const bestRevive = allGraveMonsters[0];
                    const rCard = npc.hand.splice(reviveIdx, 1)[0];
                    emitDuelLog(roomId, `✨💀 ¡${npc.username} activa "${rCard.name}" reviviendo a "${bestRevive.name}" (${bestRevive.atk} ATK) desde el Cementerio!`, 'spell');
                    await executeCardEffect(roomId, rCard, npcKey, playerKey, { target_card_id: bestRevive.id || bestRevive.card_id });
                    sendCardToGraveyard(duelState, rCard, npcKey);
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        // 2.7.2 COMBO PASO G-CHAOS: INVOCACIÓN ESPECIAL CHAOS (BLS / CED / Chaos Sorcerer)
        if (npc.monsters.some(m => m === null)) {
            const chaosInHandIdx = npc.hand.findIndex(c => { const m = manifest?.get(getCardId(c)); return m?.module?.canSpecialSummon && m.module.canSpecialSummon({ duelState, playerKey: npcKey }).canSummon; });
            if (chaosInHandIdx !== -1) {
                const gy = npc.graveyard || [];
                const lightIdx = gy.findIndex(c => {
                    const cd = ocgCardReader(c.id || c.card_id) || c.card_data || c;
                    return ((cd.attributeCode || cd.attribute) & 0x10) || (cd.attribute === 'LIGHT') || ((cd.type || '').includes('Monster') && (cd.attribute === 'LIGHT' || cd.attribute === 0x10));
                });
                const darkIdx = gy.findIndex((c, idx) => {
                    if (idx === lightIdx) return false;
                    const cd = ocgCardReader(c.id || c.card_id) || c.card_data || c;
                    return ((cd.attributeCode || cd.attribute) & 0x20) || (cd.attribute === 'DARK') || ((cd.type || '').includes('Monster') && (cd.attribute === 'DARK' || cd.attribute === 0x20));
                });

                if (lightIdx !== -1 && darkIdx !== -1) {
                    const [chaosCard] = npc.hand.splice(chaosInHandIdx, 1);
                    const lightCard = gy.splice(Math.max(lightIdx, darkIdx), 1)[0];
                    const darkCard = gy.splice(Math.min(lightIdx, darkIdx), 1)[0];
                    sendCardToBanished(duelState, lightCard, npcKey);
                    sendCardToBanished(duelState, darkCard, npcKey);

                    const summonSlot = npc.monsters.findIndex(m => m === null);
                    const cData = ocgCardReader(getCardId(chaosCard)) || chaosCard.card_data || chaosCard;
                    npc.monsters[summonSlot] = {
                        card_id: getCardId(chaosCard),
                        position: 'ATK',
                        faceDown: false,
                        hasAttacked: false,
                        turnSummoned: duelState.turnNumber,
                        hasChangedPosition: false,
                        originalOwner: npcKey,
                        card_data: { ...cData, id: getCardId(chaosCard), card_id: getCardId(chaosCard), originalOwner: npcKey }
                    };
                    calculateMonsterCurrentStats(npc.monsters[summonSlot], duelState);
                    emitDuelLog(roomId, `🌌⚡ [Invocación Especial Caos] ¡${npc.username} destierra 1 monstruo LUZ y 1 OSCURIDAD para invocar a "${cData.name}" (${cData.atk} ATK)!`, 'summon');
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));

                    // Si es BLS o Chaos Sorcerer, intentar desterrar monstruo rival
                    if (manifest?.get(getCardId(chaosCard))?.hasNativeEffect && player.monsters.some(m => m !== null)) {
                        let targetSlot = player.monsters.findIndex(m => m !== null);
                        emitDuelLog(roomId, `🌌💥 ¡${npc.username} activa el efecto de destierro de "${cData.name}"!`, 'effect');
                        await executeCardEffect(roomId, cData, npcKey, playerKey, { target_slot: targetSlot });
                        npc.monsters[summonSlot].hasAttacked = true;
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                        await new Promise(r => setTimeout(r, 600));
                    }
                }
            }
        }

        // 2.7.5 COMBO PASO G2: INVOCACIÓN ESPECIAL POR CONTACTO (XYZ, XY, XZ, YZ)
        if (npc.monsters.some(m => m !== null) && npc.extraDeck && npc.extraDeck.length > 0) {
            for (let extraIdx = 0; extraIdx < npc.extraDeck.length; extraIdx++) {
                const fCard = npc.extraDeck[extraIdx];
                const fId = getCardId(fCard);
                const contactInfo = manifest?.get(fId)?.module?.contactRecipe;

                if (contactInfo) {
                    const reqMats = contactInfo.materials;
                    const fieldSlots = [];
                    let canSummonContact = true;

                    for (const reqId of reqMats) {
                        const foundSlot = npc.monsters.findIndex((m, sIdx) => m && !fieldSlots.includes(sIdx) && getCardId(m) === reqId);
                        if (foundSlot !== -1) {
                            fieldSlots.push(foundSlot);
                        } else {
                            canSummonContact = false;
                            break;
                        }
                    }

                    if (canSummonContact && fieldSlots.length === reqMats.length) {
                        const matNames = [];
                        for (const sIdx of fieldSlots) {
                            const matCard = npc.monsters[sIdx];
                            matNames.push(matCard.card_data.name);
                            sendCardToBanished(duelState, matCard, npcKey);
                            npc.monsters[sIdx] = null;
                        }

                        const [fMonCard] = npc.extraDeck.splice(extraIdx, 1);
                        npc.extraDeckCount = npc.extraDeck.length;
                        const summonSlot = npc.monsters.findIndex(m => m === null);
                        const fData = ocgCardReader(fId) || fMonCard.card_data || fMonCard;

                        npc.monsters[summonSlot] = {
                            card_id: fId,
                            position: 'ATK',
                            faceDown: false,
                            hasAttacked: false,
                            turnSummoned: duelState.turnNumber,
                            hasChangedPosition: false,
                            originalOwner: npcKey,
                            card_data: { ...fData, id: fId, card_id: fId, originalOwner: npcKey }
                        };
                        calculateMonsterCurrentStats(npc.monsters[summonSlot], duelState);

                        emitDuelLog(roomId, `⚡⭐ [Invocación por Contacto Rival] ¡${npc.username} destierra a ${matNames.join(' + ')} para invocar a "${fData.name}" (${fData.atk} ATK / ${fData.def} DEF)!`, 'summon');
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                        await new Promise(r => setTimeout(r, 800));
                        break;
                    }
                }
            }
        }

        // 2.8 COMBO PASO H: INVOCACIONES POR FUSIÓN (Polymerization / Extra Deck)
        if (npc.monsters.some(m => m === null)) {
            let polyIdx = npc.hand.findIndex(c => Boolean(manifest?.get(getCardId(c))?.isPolymerization));
            if (polyIdx !== -1 && npc.extraDeck && npc.extraDeck.length > 0) {
                const handCards = npc.hand.map((c, idx) => ({ id: getCardId(c), handIdx: idx, name: c.name }));
                const fieldCards = npc.monsters.map((m, idx) => m ? ({ id: getCardId(m), fieldSlot: idx, name: m.card_data.name }) : null).filter(Boolean);

                let possibleFusion = null;
                let usedMaterials = [];

                for (let extraIdx = 0; extraIdx < npc.extraDeck.length; extraIdx++) {
                    const fCard = npc.extraDeck[extraIdx];
                    const fId = getCardId(fCard);
                    const recipe = manifest?.get(fId)?.module?.fusionMaterials;
                    if (recipe) {
                        let availPool = [...handCards, ...fieldCards];
                        let matched = [];
                        let canMake = true;

                        for (const reqMatId of recipe) {
                            const foundIdx = availPool.findIndex(p => p.id === reqMatId);
                            if (foundIdx !== -1) {
                                matched.push(availPool.splice(foundIdx, 1)[0]);
                            } else {
                                canMake = false;
                                break;
                            }
                        }

                        if (canMake) {
                            possibleFusion = { fCard, extraIdx, fId };
                            usedMaterials = matched;
                            break;
                        }
                    }
                }

                if (possibleFusion) {
                    const polyCard = npc.hand.splice(polyIdx, 1)[0];
                    sendCardToGraveyard(duelState, polyCard, npcKey);

                    const matNames = [];
                    for (const mat of usedMaterials) {
                        matNames.push(mat.name || 'Material');
                        if (mat.fieldSlot !== undefined) {
                            const fMon = npc.monsters[mat.fieldSlot];
                            sendCardToGraveyard(duelState, fMon, npcKey);
                            npc.monsters[mat.fieldSlot] = null;
                        } else if (mat.handIdx !== undefined) {
                            const curHIdx = npc.hand.findIndex(c => getCardId(c) === mat.id);
                            if (curHIdx !== -1) {
                                const hCard = npc.hand.splice(curHIdx, 1)[0];
                                sendCardToGraveyard(duelState, hCard, npcKey);
                            }
                        }
                    }

                    const [fMonCard] = npc.extraDeck.splice(possibleFusion.extraIdx, 1);
                    npc.extraDeckCount = npc.extraDeck.length;
                    const fSlot = npc.monsters.findIndex(m => m === null);
                    const fData = ocgCardReader(possibleFusion.fId) || fMonCard.card_data || fMonCard;

                    npc.monsters[fSlot] = {
                        card_id: possibleFusion.fId,
                        position: 'ATK',
                        faceDown: false,
                        hasAttacked: false,
                        turnSummoned: duelState.turnNumber,
                        hasChangedPosition: false,
                        originalOwner: npcKey,
                        card_data: { ...fData, id: possibleFusion.fId, card_id: possibleFusion.fId, originalOwner: npcKey }
                    };
                    calculateMonsterCurrentStats(npc.monsters[fSlot], duelState);

                    emitDuelLog(roomId, `🌀⭐ [Invocación por Fusión Rival] ¡${npc.username} fusiona ${matNames.join(' + ')} para invocar a "${fData.name}" (${fData.atk} ATK)!`, 'summon');
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 800));
                }
            }
        }

        // 2.8.5 COMBO PASO H2: INVOCACIONES POR SINCRONÍA (5D's SYNCHRO SUMMON)
        if (npc.extraDeck && npc.extraDeck.length > 0 && npc.monsters.filter(m => m !== null && !m.faceDown).length >= 2) {
            const faceUpMonsters = [];
            npc.monsters.forEach((m, sIdx) => {
                if (m && !m.faceDown && !m.isTrapped) {
                    const mData = m.card_data || ocgCardReader(m.card_id) || m;
                    const mType = (mData.type || '').toLowerCase();
                    const isTuner = mType.includes('tuner') || (mData.typeCode && (mData.typeCode & 0x1000));
                    const lvl = m.currentLevel !== undefined ? m.currentLevel : (mData.level || 1);
                    faceUpMonsters.push({
                        slot: sIdx,
                        card_id: getCardId(m),
                        name: mData.name || 'Monstruo',
                        level: lvl,
                        isTuner: Boolean(isTuner),
                        atk: m.currentAtk || mData.atk || 0,
                        cardObj: m
                    });
                }
            });

            const tuners = faceUpMonsters.filter(m => m.isTuner);
            const nonTuners = faceUpMonsters.filter(m => !m.isTuner);

            if (tuners.length > 0 && nonTuners.length > 0) {
                for (let extraIdx = 0; extraIdx < npc.extraDeck.length; extraIdx++) {
                    const sCard = npc.extraDeck[extraIdx];
                    const sId = getCardId(sCard);
                    const sData = ocgCardReader(sId) || sCard.card_data || sCard;
                    const sType = (sData.type || '').toLowerCase();
                    const isSynchro = sType.includes('synchro') || (sData.typeCode && (sData.typeCode & 0x2000));
                    const targetLevel = sData.level || 0;

                    if (isSynchro && targetLevel > 0) {
                        let matchedMaterials = null;

                        // Intentar 1 Tuner + 1 No Tuner
                        for (const t of tuners) {
                            for (const nt of nonTuners) {
                                if (t.level + nt.level === targetLevel) {
                                    matchedMaterials = [t, nt];
                                    break;
                                }
                            }
                            if (matchedMaterials) break;
                        }

                        // Intentar 1 Tuner + 2 No Tuners
                        if (!matchedMaterials && nonTuners.length >= 2) {
                            for (const t of tuners) {
                                for (let i = 0; i < nonTuners.length; i++) {
                                    for (let j = i + 1; j < nonTuners.length; j++) {
                                        if (t.level + nonTuners[i].level + nonTuners[j].level === targetLevel) {
                                            matchedMaterials = [t, nonTuners[i], nonTuners[j]];
                                            break;
                                        }
                                    }
                                    if (matchedMaterials) break;
                                }
                                if (matchedMaterials) break;
                            }
                        }

                        if (matchedMaterials) {
                            const matNames = [];
                            for (const mat of matchedMaterials) {
                                matNames.push(mat.name);
                                sendCardToGraveyard(duelState, mat.cardObj, npcKey);
                                npc.monsters[mat.slot] = null;
                            }

                            const [synchroMonCard] = npc.extraDeck.splice(extraIdx, 1);
                            npc.extraDeckCount = npc.extraDeck.length;
                            const synchroSlot = npc.monsters.findIndex(m => m === null);

                            npc.monsters[synchroSlot] = {
                                card_id: sId,
                                position: 'ATK',
                                faceDown: false,
                                hasAttacked: false,
                                turnSummoned: duelState.turnNumber,
                                hasChangedPosition: false,
                                originalOwner: npcKey,
                                card_data: { ...sData, id: sId, card_id: sId, originalOwner: npcKey }
                            };
                            calculateMonsterCurrentStats(npc.monsters[synchroSlot], duelState);

                            emitDuelLog(roomId, `⚡🌠 [Invocación por Sincronía Rival] ¡${npc.username} sintoniza a ${matNames.join(' + ')} para invocar a "${sData.name}" (${sData.atk} ATK / Nv. ${targetLevel})!`, 'summon');
                            enrichDuelStateForBroadcast(duelState);
                            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                            await new Promise(r => setTimeout(r, 800));
                            break;
                        }
                    }
                }
            }
        }

        // 2.9 COMBO PASO I: INVOCACIONES POR RITUAL (Black Illusion Ritual, Relinquished, etc.)
        if (npc.monsters.some(m => m === null)) {
            for (let hIdx = 0; hIdx < npc.hand.length; hIdx++) {
                const rSpell = npc.hand[hIdx];
                const rSpellId = getCardId(rSpell);
                const ritualInfo = manifest?.get(rSpellId)?.module?.ritualInfo;

                if (ritualInfo) {
                    const ritMonInHandIdx = npc.hand.findIndex((c, idx) => idx !== hIdx && getCardId(c) === ritualInfo.monster_id);
                    if (ritMonInHandIdx !== -1) {
                        let availableTributes = [];
                        let accumulatedStars = 0;

                        for (let fIdx = 0; fIdx < 5; fIdx++) {
                            const fm = npc.monsters[fIdx];
                            if (fm) {
                                const lvl = fm.card_data ? (fm.card_data.level || 0) : (fm.level || 0);
                                availableTributes.push({ location: 'FIELD', slot: fIdx, stars: lvl, card: fm });
                                accumulatedStars += lvl;
                                if (accumulatedStars >= ritualInfo.min_stars) break;
                            }
                        }

                        if (accumulatedStars < ritualInfo.min_stars) {
                            for (let mHIdx = 0; mHIdx < npc.hand.length; mHIdx++) {
                                if (mHIdx !== hIdx && mHIdx !== ritMonInHandIdx) {
                                    const hm = npc.hand[mHIdx];
                                    const isMon = hm.type && hm.type.includes('Monster');
                                    if (isMon) {
                                        const lvl = hm.level || 0;
                                        availableTributes.push({ location: 'HAND', handIdx: mHIdx, stars: lvl, card: hm });
                                        accumulatedStars += lvl;
                                        if (accumulatedStars >= ritualInfo.min_stars) break;
                                    }
                                }
                            }
                        }

                        if (accumulatedStars >= ritualInfo.min_stars || ritualInfo.min_stars === 1) {
                            const [castSpell] = npc.hand.splice(hIdx, 1);
                            sendCardToGraveyard(duelState, castSpell, npcKey);

                            const curRitMonIdx = npc.hand.findIndex(c => getCardId(c) === ritualInfo.monster_id);
                            const [ritMonCard] = npc.hand.splice(curRitMonIdx, 1);

                            for (const trib of availableTributes) {
                                if (trib.location === 'FIELD') {
                                    sendCardToGraveyard(duelState, npc.monsters[trib.slot], npcKey);
                                    npc.monsters[trib.slot] = null;
                                } else if (trib.location === 'HAND') {
                                    const curIdx = npc.hand.findIndex(c => getCardId(c) === getCardId(trib.card));
                                    if (curIdx !== -1) {
                                        const [tHand] = npc.hand.splice(curIdx, 1);
                                        sendCardToGraveyard(duelState, tHand, npcKey);
                                    }
                                }
                            }

                            const rSlot = npc.monsters.findIndex(m => m === null);
                            const rData = ocgCardReader(ritualInfo.monster_id) || ritMonCard.card_data || ritMonCard;
                            npc.monsters[rSlot] = {
                                card_id: ritualInfo.monster_id,
                                position: 'ATK',
                                faceDown: false,
                                hasAttacked: false,
                                turnSummoned: duelState.turnNumber,
                                hasChangedPosition: false,
                                originalOwner: npcKey,
                                card_data: { ...rData, id: ritualInfo.monster_id, card_id: ritualInfo.monster_id, originalOwner: npcKey }
                            };
                            calculateMonsterCurrentStats(npc.monsters[rSlot], duelState);

                            emitDuelLog(roomId, `🕯️✨ [Invocación por Ritual] ¡${npc.username} ofrece tributos e invoca por Ritual a "${rData.name}"!`, 'summon');
                            enrichDuelStateForBroadcast(duelState);
                            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                            await new Promise(r => setTimeout(r, 800));
                            break;
                        }
                    }
                }
            }
        }

        // 2.10 COMBO PASO J: EFECTOS DE IGNICIÓN EN CAMPO (Relinquished, Time Wizard, Barrel Dragon, Cannon Soldier, etc.)
        for (let i = 0; i < 5; i++) {
            const m = npc.monsters[i];
            if (!m || m.hasUsedEffect) continue;
            const mId = getCardId(m);
            const mName = (m.card_data?.name || '').toLowerCase();
            const cMeta = manifest.get(mId);

            // Relinquished: Absorción de monstruo
            if ((cMeta.isRelinquished || mName.includes('relinquished') || mName.includes('renunciado')) && !m.absorbedMonster && player.monsters.some(pm => pm !== null)) {
                let targetSlot = -1;
                let maxAtk = -1;
                for (let pIdx = 0; pIdx < 5; pIdx++) {
                    const pm = player.monsters[pIdx];
                    if (pm) {
                        const atk = pm.currentAtk !== undefined ? pm.currentAtk : (pm.card_data ? pm.card_data.atk : 0);
                        if (atk > maxAtk) {
                            maxAtk = atk;
                            targetSlot = pIdx;
                        }
                    }
                }
                if (targetSlot !== -1) {
                    emitDuelLog(roomId, `👁️🔮 ¡${npc.username} activa el efecto de "Renunciado" para absorber al monstruo más temible de ${player.username}!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: targetSlot, slot_index: targetSlot });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // Time Wizard: Ruleta del Tiempo
            if ((mName.includes('time wizard') || mName.includes('mago del tiempo')) && player.monsters.some(pm => pm && (pm.currentAtk || pm.card_data?.atk || 0) > 1500)) {
                emitDuelLog(roomId, `🧙‍♂️🪙 ¡${npc.username} activa el efecto de Ruleta del Tiempo de Mago del Tiempo!`, 'effect');
                await executeCardEffect(roomId, m.card_data, npcKey, playerKey);
                m.hasUsedEffect = true;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }

            // Barrel Dragon: Cañones destructores
            if ((mName.includes('barrel dragon') || mName.includes('dragón cañón') || mName.includes('dragon cañon')) && player.monsters.some(pm => pm !== null)) {
                let targetSlot = player.monsters.findIndex(pm => pm !== null);
                emitDuelLog(roomId, `🔫💥 ¡${npc.username} activa los 3 cañones de "Dragón Cañón"!`, 'effect');
                await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: targetSlot });
                m.hasUsedEffect = true;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }

            // XYZ-Dragon Cannon: Descarta 1 carta -> Destruye 1 carta del rival
            if (mName.includes('xyz-dragon cannon') && npc.hand.length > 0) {
                const targetMonIdx = player.monsters.findIndex(pm => pm !== null);
                const targetSpellIdx = player.spells.findIndex(ps => ps !== null);
                if (targetMonIdx !== -1) {
                    emitDuelLog(roomId, `💥⚡ ¡${npc.username} activa el efecto de "XYZ-Dragon Cannon" para destruir un monstruo!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: targetMonIdx, is_spell_trap: false });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                } else if (targetSpellIdx !== -1 || player.fieldSpell) {
                    emitDuelLog(roomId, `💥⚡ ¡${npc.username} activa el efecto de "XYZ-Dragon Cannon" para destruir la retaguardia!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: targetSpellIdx, is_spell_trap: true, is_field_spell: Boolean(player.fieldSpell) });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // XY-Dragon Cannon: Descarta 1 carta -> Destruye 1 Magia/Trampa boca arriba
            if (mName.includes('xy-dragon cannon') && npc.hand.length > 0) {
                const faceUpSpellIdx = player.spells.findIndex(s => s && !s.faceDown && s.position !== 'SET');
                if (faceUpSpellIdx !== -1 || player.fieldSpell) {
                    emitDuelLog(roomId, `⚡💥 ¡${npc.username} activa el efecto de "XY-Dragon Cannon" destruyendo una Magia/Trampa boca arriba!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: faceUpSpellIdx, is_spell_trap: true, is_field_spell: Boolean(player.fieldSpell) });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // XZ-Tank Cannon: Descarta 1 carta -> Destruye 1 Magia/Trampa boca abajo
            if (mName.includes('xz-tank cannon') && npc.hand.length > 0) {
                const faceDownSpellIdx = player.spells.findIndex(s => s && (s.faceDown || s.position === 'SET'));
                if (faceDownSpellIdx !== -1) {
                    emitDuelLog(roomId, `🛡️💥 ¡${npc.username} activa el efecto de "XZ-Tank Cannon" destruyendo una Magia/Trampa boca abajo!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: faceDownSpellIdx, is_spell_trap: true });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // YZ-Tank Dragon: Descarta 1 carta -> Destruye 1 monstruo boca abajo
            if (mName.includes('yz-tank dragon') && npc.hand.length > 0) {
                const faceDownMonIdx = player.monsters.findIndex(pm => pm && (pm.faceDown || pm.position === 'SET'));
                if (faceDownMonIdx !== -1) {
                    emitDuelLog(roomId, `👾💥 ¡${npc.username} activa el efecto de "YZ-Tank Dragon" destruyendo un monstruo boca abajo!`, 'effect');
                    await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: faceDownMonIdx, is_spell_trap: false });
                    m.hasUsedEffect = true;
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            // Breaker the Magical Warrior: Remueve 1 Contador Mágico -> Destruye 1 Magia/Trampa rival
            if (mName.includes('breaker the magical warrior') && (player.spells.some(s => s !== null) || player.fieldSpell)) {
                let targetSlot = player.fieldSpell ? 0 : player.spells.findIndex(s => s !== null);
                let isField = Boolean(player.fieldSpell);
                emitDuelLog(roomId, `🧙‍♂️✨ ¡${npc.username} remueve el Contador Mágico de "Breaker the Magical Warrior" para destruir una Magia/Trampa!`, 'effect');
                await executeCardEffect(roomId, m.card_data, npcKey, playerKey, {
                    target_player: playerKey,
                    target_slot: targetSlot,
                    is_field_spell: isField
                });
                m.hasUsedEffect = true;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }

            // Tribe-Infecting Virus: Descarta 1 carta -> Destruye todos los monstruos de la raza elegida
            if (mName.includes('tribe-infecting virus') && npc.hand.length > 0 && player.monsters.some(pm => pm && !pm.faceDown)) {
                const firstFaceUp = player.monsters.find(pm => pm && !pm.faceDown);
                const declaredRace = firstFaceUp?.card_data?.race || 'Warrior';
                const discCard = npc.hand.pop();
                sendCardToGraveyard(duelState, discCard, npcKey);
                emitDuelLog(roomId, `🦠💥 ¡${npc.username} descarta una carta y activa "Tribe-Infecting Virus" declarando el tipo "${declaredRace}"!`, 'effect');
                await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { declared_race: declaredRace });
                m.hasUsedEffect = true;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }

            // Exiled Force: Sacrifica a Exiled Force -> Destruye 1 monstruo en el campo rival
            if ((mName.includes('exiled force') || mName.includes('fuerza exiliada')) && player.monsters.some(pm => pm !== null)) {
                let targetSlot = player.monsters.findIndex(pm => pm !== null);
                emitDuelLog(roomId, `⚔️💥 ¡${npc.username} sacrifica a "Fuerza Exiliada" para destruir un monstruo enemigo!`, 'effect');
                await executeCardEffect(roomId, m.card_data, npcKey, playerKey, { target_slot: targetSlot });
                sendCardToGraveyard(duelState, m, npcKey);
                npc.monsters[i] = null;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // 2.11 COMBO PASO K: INVOCACIÓN NORMAL / POR SACRIFICIO TÁCTICA
        if (!duelState.normalSummonUsed) {
            const occupiedMonsterSlots = npc.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);
            const emptyMonsterSlots = npc.monsters.map((m, idx) => m === null ? idx : null).filter(idx => idx !== null);

            const monstersInHand = npc.hand
                .map((c, idx) => ({ ...c, handIdx: idx, id: getCardId(c) }))
                .filter(c => c.type && c.type.includes('Monster') && !c.type.includes('Fusion') && !c.type.includes('Ritual'));

            let chosenMonster = null;
            let tributesToUse = [];

            if (occupiedMonsterSlots.length >= 2) {
                const highBosses = monstersInHand.filter(m => (m.level || 0) >= 7).sort((a, b) => (b.atk || 0) - (a.atk || 0));
                if (highBosses.length > 0) {
                    chosenMonster = highBosses[0];
                    occupiedMonsterSlots.sort((a, b) => {
                        const atkA = npc.monsters[a].currentAtk !== undefined ? npc.monsters[a].currentAtk : (npc.monsters[a].card_data?.atk || 0);
                        const atkB = npc.monsters[b].currentAtk !== undefined ? npc.monsters[b].currentAtk : (npc.monsters[b].card_data?.atk || 0);
                        return atkA - atkB;
                    });
                    tributesToUse = occupiedMonsterSlots.slice(0, 2);
                }
            }

            if (!chosenMonster && occupiedMonsterSlots.length >= 1) {
                const midBosses = monstersInHand.filter(m => (m.level || 0) === 5 || (m.level || 0) === 6).sort((a, b) => (b.atk || 0) - (a.atk || 0));
                if (midBosses.length > 0) {
                    chosenMonster = midBosses[0];
                    occupiedMonsterSlots.sort((a, b) => {
                        const atkA = npc.monsters[a].currentAtk !== undefined ? npc.monsters[a].currentAtk : (npc.monsters[a].card_data?.atk || 0);
                        const atkB = npc.monsters[b].currentAtk !== undefined ? npc.monsters[b].currentAtk : (npc.monsters[b].card_data?.atk || 0);
                        return atkA - atkB;
                    });
                    tributesToUse = [occupiedMonsterSlots[0]];
                }
            }

            if (!chosenMonster && (emptyMonsterSlots.length > 0 || tributesToUse.length > 0)) {
                const lowMonsters = monstersInHand.filter(m => (m.level || 4) <= 4).sort((a, b) => (b.atk || 0) - (a.atk || 0));
                if (lowMonsters.length > 0) {
                    chosenMonster = lowMonsters[0];
                    tributesToUse = [];
                }
            }

            if (chosenMonster) {
                tributesToUse.forEach(slotIdx => {
                    const sacrificed = npc.monsters[slotIdx];
                    sendCardToGraveyard(duelState, sacrificed, npcKey);
                    npc.monsters[slotIdx] = null;
                });

                const curHandIdx = npc.hand.findIndex(c => getCardId(c) === chosenMonster.id);
                if (curHandIdx !== -1) {
                    const monCard = npc.hand.splice(curHandIdx, 1)[0];
                    const summonSlot = npc.monsters.findIndex(m => m === null);

                    if (summonSlot !== -1) {
                        const isDragon = isDragonMonster(monCard);
                        const isDragonJarActive = isDragonJarActiveOnField(duelState);
                        const isFlip = Boolean(manifest?.get(chosenMonster.id)?.isFlip);
                        let isDef = isFlip || ((monCard.def || 0) > (monCard.atk || 0) && (monCard.atk || 0) < 1400);
                        if (isDragonJarActive && isDragon) isDef = true;

                        npc.monsters[summonSlot] = {
                            card_id: chosenMonster.id,
                            position: isDef ? 'DEF' : 'ATK',
                            faceDown: isDef,
                            hasAttacked: false,
                            turnSummoned: duelState.turnNumber,
                            hasChangedPosition: false,
                            originalOwner: npcKey,
                            card_data: { ...monCard, id: chosenMonster.id, card_id: chosenMonster.id, originalOwner: npcKey }
                        };
                        calculateMonsterCurrentStats(npc.monsters[summonSlot], duelState);
                        duelState.normalSummonUsed = true;

                        if (tributesToUse.length > 0) {
                            emitDuelLog(roomId, `⭐ [Sacrificio Rival] ¡${npc.username} tributa ${tributesToUse.length} monstruo(s) para invocar a "${monCard.name}" (Nv. ${monCard.level}, ${monCard.atk} ATK)!`, 'tribute');
                        } else {
                            emitDuelLog(roomId, `⚔️ [Invocación Rival] ${npc.username} invoca a "${monCard.name}" en Modo ${isDef ? 'Defensa' : 'Ataque'}.`, 'summon');
                        }

                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                        const hasTraps = player.spells.some(s => s && (s.faceDown || s.position === 'SET'));
                        if (hasTraps) {
                            await promptNpcChainWindowWithSafety(roomId, `¡${npc.username} invocó a ${monCard.name}!`, monCard, player.username);
                        }
                        await new Promise(r => setTimeout(r, 600));
                    }
                }
            }
        }

        // 2.12 COMBO PASO L: MAGIAS DE EQUIPO INTELIGENTES
        const equipSpellsInHand = npc.hand
            .map((c, idx) => ({ ...c, handIdx: idx }))
            .filter(c => (c.type && c.type.includes('Equip')) || c.race === 'Equip');

        for (const eq of equipSpellsInHand) {
            const emptySpellSlot = npc.spells.findIndex(s => s === null);
            let bestMonsterIdx = -1;
            let maxAtk = -1;
            for (let i = 0; i < 5; i++) {
                const m = npc.monsters[i];
                if (m && !m.faceDown) {
                    const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                    if (atk > maxAtk) {
                        maxAtk = atk;
                        bestMonsterIdx = i;
                    }
                }
            }

            if (emptySpellSlot !== -1 && bestMonsterIdx !== -1) {
                const curIdx = npc.hand.findIndex(c => (c.id || c.card_id) === (eq.id || eq.card_id));
                if (curIdx !== -1) {
                    const eqCard = npc.hand.splice(curIdx, 1)[0];
                    const targetMonster = npc.monsters[bestMonsterIdx];
                    npc.spells[emptySpellSlot] = {
                        card_id: eqCard.id || eqCard.card_id,
                        position: 'ACT',
                        faceDown: false,
                        card_data: eqCard
                    };
                    const targetMonsterName = (targetMonster.card_data && targetMonster.card_data.name) || targetMonster.name || 'Monstruo';
                    emitDuelLog(roomId, `🗡️ [Magia de Equipo Rival] ¡${npc.username} equipa "${eqCard.name}" a "${targetMonsterName}"!`, 'spell');
                    await executeCardEffect(roomId, eqCard, npcKey, playerKey, {
                        slot_index: bestMonsterIdx,
                        target_player: npcKey
                    });
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        // 2.13 COMBO PASO M: MAGIAS DE DAÑO DIRECTO / CURACIÓN (Sparks, Hinotama, Ookazi, Dian Keto, etc.)
        const burnSpells = npc.hand.filter(c => Boolean(manifest?.get(getCardId(c))?.isBurnSpell));
        for (const bSpell of burnSpells) {
            const bId = getCardId(bSpell);
            const curIdx = npc.hand.findIndex(c => getCardId(c) === bId);
            if (curIdx !== -1) {
                const spellCard = npc.hand.splice(curIdx, 1)[0];
                emitDuelLog(roomId, `🔥✨ ¡${npc.username} activa "${spellCard.name}" desde su mano!`, 'spell');
                await executeCardEffect(roomId, spellCard, npcKey, playerKey);
                sendCardToGraveyard(duelState, spellCard, npcKey);
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                if (checkDuelGameOver(roomId, duelState)) return;
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // 2.14 COMBO PASO N: COLOCAR TRAMPAS Y MAGIAS RÁPIDAS EN RETAGUARDIA (BACKROW)
        for (let i = 0; i < 5; i++) {
            const emptySpellIndex = npc.spells.findIndex(s => s === null);
            if (emptySpellIndex === -1) break;

            const stInHandIdx = npc.hand.findIndex(c => {
                const t = (c.type || '').toString();
                const r = (c.race || '').toString();
                const m = manifest?.get(getCardId(c)); return Boolean(m?.isTrap || m?.isQuickPlay || t.includes('Trap') || r.includes('Trap') || t.includes('Quick-Play') || r.includes('Quick-Play'));
            });

            if (stInHandIdx !== -1) {
                const cardToSet = npc.hand.splice(stInHandIdx, 1)[0];
                npc.spells[emptySpellIndex] = {
                    card_id: getCardId(cardToSet),
                    position: 'SET',
                    faceDown: true,
                    card_data: cardToSet
                };
                emitDuelLog(roomId, `🎴 [Rival SET] ${npc.username} coloca una carta boca abajo en su Zona Mágica.`, 'spell');
            }
        }

        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        await new Promise(r => setTimeout(r, 800));

        // =====================================================================
        // 3. BATTLE PHASE DEL NPC - OPTIMIZADOR LETAL Y COMBATE INTELIGENTE
        // =====================================================================
        if (duelState.turnNumber > 1) {
            duelState.phase = 'BATTLE';
            emitDuelLog(roomId, `⚔️ [Rival] BATTLE PHASE.`, 'phase');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 600));

            const swordsActiveOnPlayer = player.spells && player.spells.some(s => s && manifest?.get(getCardId(s))?.isSwords && !s.faceDown);
            if (swordsActiveOnPlayer) {
                emitDuelLog(roomId, `⚔️✨ [Espadas de la Luz Reveladora] ${npc.username} no puede declarar ataques debido al efecto continuo de las Espadas de la Luz Reveladora en el campo de ${player.username}.`, 'spell');
            } else {
                let attackLoopActive = true;
                while (attackLoopActive) {
                    if (checkDuelGameOver(roomId, duelState)) break;

                    // 1. Obtener lista de atacantes listos ordenados de MAYOR ATK a MENOR ATK
                    const readyAttackers = [];
                    for (let s = 0; s < 5; s++) {
                        const m = npc.monsters[s];
                        if (m && m.position === 'ATK' && !m.hasAttacked && !m.isTrapped) {
                            const curAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0);
                            const messengerActive = [...(player.spells || []), ...(npc.spells || [])].some(sp => sp && manifest?.get(getCardId(sp))?.isMessengerOfPeace && !sp.faceDown);
                            if (!messengerActive || curAtk < 1500) {
                                readyAttackers.push({ slot: s, monster: m, atk: curAtk });
                            }
                        }
                    }

                    if (readyAttackers.length === 0) {
                        break;
                    }

                    readyAttackers.sort((a, b) => b.atk - a.atk);
                    let attackerDeclared = false;

                    for (const { slot, monster: attacker, atk: attackerAtk } of readyAttackers) {
                        if (attacker.hasAttacked) continue;

                        const oppHasMonsters = player.monsters.some(m => m !== null);
                        let targetIdx = -1;

                        if (oppHasMonsters) {
                            // Buscar monstruo en Ataque que pueda destruir (priorizar el de mayor ATK para limpiar amenaza grande)
                            let bestAtkTarget = -1;
                            let maxTargetAtk = -1;
                            for (let pSlot = 0; pSlot < 5; pSlot++) {
                                const pm = player.monsters[pSlot];
                                if (pm && pm.position === 'ATK') {
                                    const pAtk = pm.currentAtk !== undefined ? pm.currentAtk : (pm.card_data?.atk || 0);
                                    if (attackerAtk >= pAtk && pAtk > maxTargetAtk) {
                                        maxTargetAtk = pAtk;
                                        bestAtkTarget = pSlot;
                                    }
                                }
                            }

                            if (bestAtkTarget !== -1) {
                                targetIdx = bestAtkTarget;
                            } else {
                                // Buscar monstruo en Defensa boca arriba que pueda superar
                                let bestDefTarget = -1;
                                for (let pSlot = 0; pSlot < 5; pSlot++) {
                                    const pm = player.monsters[pSlot];
                                    if (pm && pm.position === 'DEF' && !pm.faceDown) {
                                        const pDef = pm.currentDef !== undefined ? pm.currentDef : (pm.card_data?.def || 0);
                                        if (attackerAtk > pDef) {
                                            bestDefTarget = pSlot;
                                            break;
                                        }
                                    }
                                }

                                if (bestDefTarget !== -1) {
                                    targetIdx = bestDefTarget;
                                } else {
                                    // Monstruo boca abajo
                                    const faceDownSlot = player.monsters.findIndex(m => m !== null && m.faceDown);
                                    if (faceDownSlot !== -1 && attackerAtk >= 1200) {
                                        targetIdx = faceDownSlot;
                                    }
                                }
                            }

                            if (targetIdx === -1) {
                                // Este atacante no puede superar ninguna defensa rival sin morir
                                attacker.hasAttacked = true;
                                continue;
                            }
                        }

                        attackerDeclared = true;

                        const hasKuriboh = player.hand.some(c => Boolean(manifest?.get(getCardId(c))?.isHandTrap));
                        const hasTraps = player.spells.some(s => s && (s.faceDown || s.position === 'SET'));

                        if (hasKuriboh || hasTraps) {
                            duelState.pendingAction = {
                                type: 'ATTACK',
                                attackerSlot: slot,
                                targetSlot: targetIdx,
                                isNpcAttack: true,
                                attackerAtk: attackerAtk,
                                kuribohProtected: false,
                                negated: false
                            };
                            const attackerCard = attacker.card_data || attacker;
                            const attackerCardName = (attacker.card_data && attacker.card_data.name) || attacker.name || 'Monstruo';
                            await promptNpcChainWindowWithSafety(roomId, `¡${npc.username} declara un ataque con ${attackerCardName}!`, attackerCard, player.username);
                        }

                        if (!npc.monsters[slot] || npc.monsters[slot] !== attacker) {
                            break;
                        }

                        if (duelState.pendingAction && duelState.pendingAction.negated) {
                            attacker.hasAttacked = true;
                            duelState.pendingAction = null;
                            break;
                        }

                        const kuribohProtected = (duelState.pendingAction && duelState.pendingAction.kuribohProtected) || duelState.kuribohShieldActive;
                        if (duelState.kuribohShieldActive) duelState.kuribohShieldActive = false;

                        if (!oppHasMonsters || targetIdx === -1) {
                            const dmg = kuribohProtected ? 0 : attackerAtk;
                            const attackerName = (attacker.card_data && attacker.card_data.name) || attacker.name || 'Monstruo Atacante';
                            player.lp = Math.max(0, player.lp - dmg);
                            attacker.hasAttacked = true;
                            if (kuribohProtected) {
                                emitDuelLog(roomId, `🛡️ ¡Efecto de Kuriboh! El daño de "${attackerName}" fue reducido a 0 LP.`, 'battle');
                            } else {
                                emitDuelLog(roomId, `💥 ¡Ataque Directo de "${attackerName}" por ${attackerAtk} puntos de daño a tus LP! (LP: ${player.lp})`, 'battle', {
                                    attacker: attackerName,
                                    damage: attackerAtk,
                                    playerLp: player.lp
                                });
                            }
                            if (checkDuelGameOver(roomId, duelState)) return;
                        } else {
                            const defender = player.monsters[targetIdx];
                            if (!defender) {
                                attacker.hasAttacked = true;
                                break;
                            }

                            const attackerName = (attacker.card_data && attacker.card_data.name) || attacker.name || 'Monstruo Atacante';
                            const defenderName = (defender.card_data && defender.card_data.name) || defender.name || 'Monstruo Defensor';
                            const defAtk = defender.currentAtk !== undefined ? defender.currentAtk : ((defender.card_data && defender.card_data.atk) || defender.atk || 0);
                            const defDef = defender.currentDef !== undefined ? defender.currentDef : ((defender.card_data && defender.card_data.def) || defender.def || 0);

                            if (defender.position === 'ATK') {
                                const diff = attackerAtk - defAtk;
                                if (diff > 0) {
                                    sendCardToGraveyard(duelState, defender, playerKey);
                                    player.monsters[targetIdx] = null;
                                    const dmg = kuribohProtected ? 0 : diff;
                                    player.lp = Math.max(0, player.lp - dmg);
                                    emitDuelLog(roomId, `⚔️💥 "${attackerName}" (${attackerAtk} ATK) destruye a "${defenderName}" (${defAtk} ATK)! ${player.username} recibe ${dmg} de daño. (LP: ${player.lp})`, 'battle', {
                                        attacker: attackerName,
                                        defender: defenderName,
                                        damage: dmg,
                                        playerLp: player.lp
                                    });
                                } else if (diff === 0) {
                                    sendCardToGraveyard(duelState, defender, playerKey);
                                    player.monsters[targetIdx] = null;
                                    sendCardToGraveyard(duelState, attacker, npcKey);
                                    npc.monsters[slot] = null;
                                    emitDuelLog(roomId, `⚔️💥 ¡Doble destrucción! "${attackerName}" y "${defenderName}" (${defAtk} ATK) se destruyen mutuamente.`, 'battle');
                                } else {
                                    sendCardToGraveyard(duelState, attacker, npcKey);
                                    npc.monsters[slot] = null;
                                    const recoil = Math.abs(diff);
                                    npc.lp = Math.max(0, npc.lp - recoil);
                                    emitDuelLog(roomId, `⚔️💥 ¡Contragolpe! "${attackerName}" fue destruido por "${defenderName}". (LP Rival: ${npc.lp})`, 'battle');
                                }
                            } else {
                                const wasFaceDown = defender.faceDown;
                                defender.faceDown = false;

                                if (wasFaceDown) {
                                    emitDuelLog(roomId, `🔄 [Volteo en Combate] ¡"${defenderName}" fue volteado boca arriba por el ataque de "${attackerName}"!`, 'position');
                                }

                                if (wasFaceDown && defender.card_data) {
                                    const flipId = getCardId(defender);
                                    const isFlip = (defender.card_data.type && defender.card_data.type.includes('Flip')) 
                                        || (defender.card_data && (Number(defender.card_data.type) & 0x200000)) 
                                        || Boolean(manifest?.get(flipId)?.isFlip);

                                    if (isFlip) {
                                        emitDuelLog(roomId, `⚡ [Efecto de Volteo] ¡"${defender.card_data.name}" activa su Efecto de Volteo al ser atacado!`, 'effect');
                                        enrichDuelStateForBroadcast(duelState);
                                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                                        await new Promise(r => setTimeout(r, 400));

                                        duelState.pendingAction = { type: 'ATTACK', attackerSlot: slot };
                                        await executeCardEffect(roomId, defender.card_data, playerKey, npcKey, {
                                            slot_index: slot,
                                            target_slot: slot,
                                            target_player: npcKey
                                        });
                                        duelState.pendingAction = null;
                                    }
                                }

                                if (!npc.monsters[slot]) {
                                    emitDuelLog(roomId, `⚔️ El atacante fue removido del campo por el efecto de volteo.`, 'battle');
                                } else if (attackerAtk > defDef) {
                                    sendCardToGraveyard(duelState, defender, playerKey);
                                    player.monsters[targetIdx] = null;
                                    emitDuelLog(roomId, `⚔️🛡️ "${attacker.card_data.name}" (${attackerAtk} ATK) pulveriza la defensa de "${defender.card_data.name}" (${defDef} DEF) y lo envía al Cementerio.`, 'battle');
                                } else if (defDef > attackerAtk) {
                                    const recoil = defDef - attackerAtk;
                                    npc.lp = Math.max(0, npc.lp - recoil);
                                    emitDuelLog(roomId, `⚔️🛡️ ¡Defensa superior! "${defender.card_data.name}" (${defDef} DEF) resiste el ataque. ${npc.username} recibe ${recoil} de daño reflejado. (LP Rival: ${npc.lp})`, 'battle');
                                } else {
                                    emitDuelLog(roomId, `⚔️🛡️ Ataque empatado (${attackerAtk} ATK vs ${defDef} DEF). Ningún monstruo es destruido.`, 'battle');
                                }
                            }

                            if (npc.monsters[slot]) {
                                attacker.hasAttacked = true;
                            }
                        }

                        duelState.pendingAction = null;
                        if (checkDuelGameOver(roomId, duelState)) return;
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                        await new Promise(r => setTimeout(r, 600));
                        break;
                    }

                    if (!attackerDeclared) {
                        break;
                    }
                }
            }
            duelState.pendingAction = null;
        } else {
            duelState.pendingAction = null;
            emitDuelLog(roomId, `⏱️ [Regla Oficial Konami] ${npc.username} no puede entrar en Battle Phase ni atacar en el Turno 1. Pasando a End Phase.`, 'phase');
        }

        // =====================================================================
        // 4. END PHASE DEL NPC
        // =====================================================================
        duelState.phase = 'END';
        emitDuelLog(roomId, `⏳ [Rival] END PHASE.`, 'phase');
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        await new Promise(r => setTimeout(r, 600));

        if (player.spells) {
            for (let i = 0; i < 5; i++) {
                const s = player.spells[i];
                if (s && manifest?.get(getCardId(s))?.isSwords && !s.faceDown) {
                    s.turnCounter = (s.turnCounter || 0) + 1;
                    emitDuelLog(roomId, `⚔️✨ [Espadas de la Luz Reveladora] Turno ${s.turnCounter}/3 del oponente completado.`, 'spell');
                    if (s.turnCounter >= 3) {
                        sendCardToGraveyard(duelState, s, playerKey);
                        player.spells[i] = null;
                        emitDuelLog(roomId, `⚔️💥 [Espadas de la Luz Reveladora] Han transcurrido 3 turnos del oponente. Las Espadas son destruidas.`, 'spell');
                    }
                }
            }
        }

        if (npc.hand.length > 6) {
            const excess = npc.hand.length - 6;
            for (let i = 0; i < excess; i++) {
                if (npc.hand.length > 0) {
                    const disc = npc.hand.pop();
                    sendCardToGraveyard(duelState, disc, npcKey);
                }
            }
            emitDuelLog(roomId, `📦 [Regla de Mano] ${npc.username} descartó ${excess} carta(s) al Cementerio por límite de 6 cartas.`, 'phase');
        }

        for (let i = 0; i < 5; i++) {
            if (player.monsters[i]) {
                player.monsters[i].hasAttacked = false;
                player.monsters[i].hasUsedEffect = false;
                player.monsters[i].hasChangedPosition = false;
                player.monsters[i].isBattleProtectedThisTurn = false;
            }
            if (npc.monsters[i]) {
                npc.monsters[i].hasAttacked = false;
                npc.monsters[i].hasUsedEffect = false;
                npc.monsters[i].hasChangedPosition = false;
                npc.monsters[i].isBattleProtectedThisTurn = false;
            }
        }
        duelState.turnLingeringEffects = [];
        duelState.wabokuActivePlayer = null;
        duelState.wabokuActivePlayers = {};
        player.wabokuActive = false;
        npc.wabokuActive = false;
        duelState.normalSummonUsed = false;
        returnTemporaryControlledMonsters(duelState);

        // =====================================================================
        // 5. CEDER TURNO AL JUGADOR
        // =====================================================================
        duelState.turnPlayer = player.username;
        duelState.turnNumber++;
        duelState.phase = 'DRAW';
        emitDuelLog(roomId, `⏳ [Turno ${duelState.turnNumber}] Turno de ${player.username} (DRAW PHASE).`, 'phase');

        if (checkDeckOut(roomId, duelState, playerKey)) return;
        if (player.deck && player.deck.length > 0) {
            const drawn = player.deck.pop();
            player.hand.push(drawn);
            player.mainDeckCount = player.deck.length;
            emitDuelLog(roomId, `🃏 ${player.username} roba 1 carta en su Draw Phase.`, 'draw');
        }
        if (checkDuelGameOver(roomId, duelState)) return;

        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

        setTimeout(() => {
            if (duelState.turnPlayer === player.username && duelState.phase === 'DRAW') {
                duelState.phase = 'STANDBY';
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                setTimeout(() => {
                    if (duelState.turnPlayer === player.username && duelState.phase === 'STANDBY') {
                        duelState.phase = 'MAIN_1';
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                        if (typeof global.restartDuelTimer === 'function') {
                            global.restartDuelTimer(roomId);
                        }
                    }
                }, 600);
            }
        }, 800);
    } catch (err) {
        console.error('[NPC AI ERROR]', err);
    }
}

function finalizeTurnHandoffToRival(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState || duelState.isGameOver) return;
    const manifest = getRoomManifest(roomId);

    const isPlayer2Turn = Boolean(
        duelState.player2 && 
        duelState.player2.username && 
        duelState.turnPlayer && 
        duelState.turnPlayer.trim().toLowerCase() === duelState.player2.username.trim().toLowerCase()
    );
    const currentTurnKey = isPlayer2Turn ? 'player2' : 'player1';
    const nextTurnKey = currentTurnKey === 'player1' ? 'player2' : 'player1';
    const currentPlayer = duelState[currentTurnKey];
    const nextPlayer = duelState[nextTurnKey];

    setTimeout(() => {
        if (!duelState || duelState.isGameOver) return;

        if (nextPlayer.spells) {
            for (let i = 0; i < 5; i++) {
                const s = nextPlayer.spells[i];
                if (s && manifest?.get(getCardId(s))?.isSwords && !s.faceDown) {
                    s.turnCounter = (s.turnCounter || 0) + 1;
                    emitDuelLog(roomId, `⚔️✨ [Espadas de la Luz Reveladora] Turno ${s.turnCounter}/3 del oponente completado.`, 'spell');
                    if (s.turnCounter >= 3) {
                        sendCardToGraveyard(duelState, s, nextTurnKey);
                        nextPlayer.spells[i] = null;
                        emitDuelLog(roomId, `⚔️💥 [Espadas de la Luz Reveladora] Han transcurrido 3 turnos del oponente. Las Espadas de la Luz Reveladora son destruidas.`, 'spell');
                    }
                }
            }
        }

        ['player1', 'player2'].forEach(pKey => {
            const p = duelState[pKey];
            if (p) {
                p.wabokuActive = false;
                if (p.monsters) {
                    for (let i = 0; i < 5; i++) {
                        if (p.monsters[i]) {
                            p.monsters[i].hasAttacked = false;
                            p.monsters[i].hasUsedEffect = false;
                            p.monsters[i].hasChangedPosition = false;
                            p.monsters[i].isBattleProtectedThisTurn = false;
                        }
                    }
                }
            }
        });
        duelState.turnLingeringEffects = [];
        duelState.wabokuActivePlayer = null;
        duelState.wabokuActivePlayers = {};
        duelState.normalSummonUsed = false;
        returnTemporaryControlledMonsters(duelState);

        duelState.turnPlayer = nextPlayer.username;
        duelState.turnNumber++;
        duelState.phase = 'DRAW';

        emitDuelLog(roomId, `⏳ [Turno ${duelState.turnNumber}] Turno de ${nextPlayer.username} (DRAW PHASE).`, 'phase');

        if (checkDeckOut(roomId, duelState, nextTurnKey)) return;
        if (nextPlayer.deck && nextPlayer.deck.length > 0) {
            const drawn = nextPlayer.deck.pop();
            nextPlayer.hand.push(drawn);
            nextPlayer.mainDeckCount = nextPlayer.deck.length;
            emitDuelLog(roomId, `🃏 ${nextPlayer.username} roba 1 carta en su Draw Phase.`, 'draw');
        }
        if (checkDuelGameOver(roomId, duelState)) return;

        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

        setTimeout(() => {
            if (duelState.turnPlayer === nextPlayer.username && duelState.phase === 'DRAW') {
                duelState.phase = 'STANDBY';
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                setTimeout(() => {
                    if (duelState.turnPlayer === nextPlayer.username && duelState.phase === 'STANDBY') {
                        duelState.phase = 'MAIN_1';
                        enrichDuelStateForBroadcast(duelState);
                        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                        if (typeof global.restartDuelTimer === 'function') {
                            global.restartDuelTimer(roomId);
                        }

                        if (isNpcOpponent(nextPlayer, roomId)) {
                            console.log(`[NPC AI] Turno entregado a ${nextPlayer.username}. Programando turno de IA...`);
                            setTimeout(() => executeNpcTurn(roomId), 800);
                        }
                    }
                }, 500);
            }
        }, 600);
    }, 800);
}

function returnTemporaryControlledMonsters(duelState) {
    if (!duelState) return;
    ['player1', 'player2'].forEach(pKey => {
        const oppKey = pKey === 'player1' ? 'player2' : 'player1';
        const p = duelState[pKey];
        const opp = duelState[oppKey];
        if (!p || !p.monsters || !opp || !opp.monsters) return;

        for (let i = 0; i < 5; i++) {
            const m = p.monsters[i];
            if (m && m.controlledUntilEndPhase) {
                delete m.controlledUntilEndPhase;
                p.monsters[i] = null;
                const oppSlot = opp.monsters.findIndex(slot => slot === null);
                if (oppSlot !== -1) {
                    opp.monsters[oppSlot] = m;
                    calculateMonsterCurrentStats(m, duelState);
                    emitDuelLog(duelState.roomId, `🔄 [Fin de Turno] "${m.card_data ? m.card_data.name : 'Monstruo'}" regresa al control de su dueño original (${opp.username}).`, 'effect');
                } else {
                    sendCardToGraveyard(duelState, m, oppKey);
                    emitDuelLog(duelState.roomId, `💥 [Fin de Turno] "${m.card_data ? m.card_data.name : 'Monstruo'}" no pudo regresar porque el campo de ${opp.username} está lleno; es enviado al Cementerio.`, 'effect');
                }
            }
        }
    });
}

module.exports = {
    executeNpcTurn,
    finalizeTurnHandoffToRival,
    isNpcOpponent,
    returnTemporaryControlledMonsters
};
