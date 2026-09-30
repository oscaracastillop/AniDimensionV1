const { execFileSync } = require('child_process');
const path = require('path');

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
const { ocgLuaRunner } = require('../ocgcore/lua-runner');

function isNpcOpponent(player) {
    if (!player) return false;
    if (player.isNpc) return true;
    const name = (player.username || '').toLowerCase();
    return name.includes('npc') || name.includes('yugi') || name.includes('yami') || name.includes('nv.');
}

function getPythonAiDecision(duelState, playerKey) {
    try {
        const npcName = duelState[playerKey] ? duelState[playerKey].username : '';
        let level = 30;
        const match = npcName.match(/\(Nv\.\s*(\d+)\)/);
        if (match) {
            level = parseInt(match[1], 10);
        } else if (npcName.includes('100') || npcName.includes('Yami')) {
            level = 100;
        }

        const scriptPath = path.join(__dirname, '..', 'ai_agent', 'ocg_ai.py');
        const payload = JSON.stringify({ state: duelState, player_key: playerKey, level: level });
        const output = execFileSync('python', [scriptPath, payload], { timeout: 1500, encoding: 'utf-8' });
        const res = JSON.parse(output);
        if (res && !res.error) return res;
    } catch (err) {
        console.log('[NPC AI BRIDGE] Using internal fast fallback engine solver.');
    }
    return null;
}

async function executeNpcTurn(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;
    if (!isNpcOpponent(duelState.player2)) return;
    if (duelState.turnPlayer !== duelState.player2.username) return;

    const npc = duelState.player2;
    const player = duelState.player1;

    try {
        console.log(`[NPC AI] Iniciando turno automatizado de ${npc.username} (Turno ${duelState.turnNumber})...`);

        // 1. STANDBY PHASE del NPC
        duelState.phase = 'STANDBY';
        emitDuelLog(roomId, `⏱️ [Rival] STANDBY PHASE.`, 'phase');
        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

        await new Promise(r => setTimeout(r, 1000));

        // 2. MAIN PHASE 1 del NPC
        duelState.phase = 'MAIN_1';
        emitDuelLog(roomId, `⏱️ [Rival] MAIN PHASE 1.`, 'phase');

        // 2.0 CAMBIO DE POSICIÓN / INVOCACIÓN POR VOLTEO DEL NPC
        // Monstruos en DEF que no fueron invocados en este turno pueden cambiar a ATK o voltearse
        for (let i = 0; i < 5; i++) {
            const m = npc.monsters[i];
            if (m && m.position === 'DEF' && m.turnSummoned !== duelState.turnNumber && !m.hasChangedPosition && !m.isTrapped) {
                const wasFaceDown = m.faceDown;
                m.position = 'ATK';
                m.faceDown = false;
                m.hasChangedPosition = true;
                if (wasFaceDown) {
                    emitDuelLog(roomId, `🔄⭐ [Invocación por Volteo Rival] ${npc.username} cambia a "${m.card_data.name}" a Modo de Ataque!`, 'position');
                    const flipId = m.card_id || (m.card_data ? m.card_data.id : 0);
                    const isFlip = (m.card_data && m.card_data.type && typeof m.card_data.type === 'string' && m.card_data.type.includes('Flip')) 
                        || (m.card_data && (Number(m.card_data.type) & 0x200000)) 
                        || [54652250, 7089711, 9076207, 33066139].includes(flipId);
                    if (isFlip) {
                        await executeCardEffect(roomId, m.card_data, 'player2', 'player1');
                    }
                } else {
                    emitDuelLog(roomId, `🔄 [Cambio de Posición Rival] ${npc.username} cambia a "${m.card_data.name}" a Modo de Ataque!`, 'position');
                }
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // 2.1 Activación inteligente de Magias de Campo del NPC
        const fieldSpellIdx = npc.hand.findIndex(c => (c.type && c.type.includes('Field')) || (c.race === 'Field'));
        if (fieldSpellIdx !== -1) {
            const fsCard = npc.hand.splice(fieldSpellIdx, 1)[0];
            npc.fieldSpell = { card_id: fsCard.id, card_data: fsCard };
            emitDuelLog(roomId, `🌌 [Campo Mágico Rival] ${npc.username} activa el Campo "${fsCard.name}".`, 'field');
            await executeCardEffect(roomId, fsCard, 'player2', 'player1');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            await new Promise(r => setTimeout(r, 800));
        }

        // 2.2 Activación inteligente de Magias de Equipo del NPC (LOB y OCG)
        const equipSpellsInHand = npc.hand
            .map((c, idx) => ({ ...c, handIdx: idx }))
            .filter(c => c.type && c.type.includes('Equip'));

        for (const eq of equipSpellsInHand) {
            const emptySpellSlot = npc.spells.findIndex(s => s === null);
            const eligibleMonsterIdx = npc.monsters.findIndex(m => m !== null && !m.faceDown && ocgLuaRunner.checkCanEquip(eq.id || eq.card_id, m.card_data || m).valid);
            if (emptySpellSlot !== -1 && eligibleMonsterIdx !== -1) {
                const curIdx = npc.hand.findIndex(c => (c.id || c.card_id) === (eq.id || eq.card_id));
                if (curIdx !== -1) {
                    const eqCard = npc.hand.splice(curIdx, 1)[0];
                    const targetMonster = npc.monsters[eligibleMonsterIdx];
                    npc.spells[emptySpellSlot] = {
                        card_id: eqCard.id || eqCard.card_id,
                        position: 'ACT',
                        faceDown: false,
                        card_data: eqCard
                    };
                    emitDuelLog(roomId, `🗡️ [Magia de Equipo Rival] ${npc.username} activa "${eqCard.name}" equipándola a "${targetMonster.card_data.name}"!`, 'spell');
                    await executeCardEffect(roomId, eqCard, 'player2', 'player1', {
                        slot_index: eligibleMonsterIdx,
                        target_player: 'player2'
                    });
                    enrichDuelStateForBroadcast(duelState);
                    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    await new Promise(r => setTimeout(r, 800));
                }
            }
        }

        // 2.3 Activación inteligente de Magias Normales del NPC (mediante scripts Lua OCG)
        const normalSpellsInHand = npc.hand
            .map((c, idx) => ({ ...c, handIdx: idx }))
            .filter(c => c.type && (c.type.includes('Spell')) && !c.type.includes('Equip') && !c.type.includes('Field') && !c.type.includes('Quick-Play'));

        for (const spell of normalSpellsInHand) {
            const spellId = spell.id || spell.card_id;
            let targetData = null;

            // Raigeki (12580477) / Dark Hole (53129443) / Fissure (66788016): solo si el oponente tiene monstruos
            if ([12580477, 53129443, 66788016].includes(spellId)) {
                if (!player.monsters.some(m => m !== null)) continue;
            }
            // Stop Defense (63102017): solo si el rival tiene monstruos en DEF
            else if (spellId === 63102017) {
                const defSlot = player.monsters.findIndex(m => m !== null && m.position === 'DEF');
                if (defSlot === -1) continue;
                targetData = { slot_index: defSlot, target_player: 'player1' };
            }
            // Remove Trap (51482758): si el rival tiene trampas en campo
            else if (spellId === 51482758) {
                const trapSlot = player.spells.findIndex(s => s !== null);
                if (trapSlot === -1) continue;
                targetData = { slot_index: trapSlot, target_player: 'player1' };
            }
            // Monster Reborn (83764718): si hay monstruos en algún GY
            else if (spellId === 83764718) {
                const hasMonInGy = (player.graveyard && player.graveyard.length > 0) || (npc.graveyard && npc.graveyard.length > 0);
                if (!hasMonInGy) continue;
            }

            const curIdx = npc.hand.findIndex(c => (c.id || c.card_id) === spellId);
            if (curIdx !== -1) {
                const spellCard = npc.hand.splice(curIdx, 1)[0];
                emitDuelLog(roomId, `✨ [Activación Rival] ${npc.username} activa "${spellCard.name}" desde su mano.`, 'spell');
                await executeCardEffect(roomId, spellCard, 'player2', 'player1', targetData);
                sendCardToGraveyard(duelState, spellCard, 'player2');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 800));
            }
        }

        // 2.4 REGLA OFICIAL OCG: Invocación Normal y por Sacrificio reglamentaria del NPC
        const monstersOnFieldIndices = npc.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);
        const emptyMonsterSlots = npc.monsters.map((m, idx) => m === null ? idx : null).filter(idx => idx !== null);

        // Buscar monstruos en la mano del NPC
        const monstersInHand = npc.hand
            .map((c, idx) => ({ ...c, handIdx: idx }))
            .filter(c => c.type && c.type.includes('Monster'));

        let chosenMonster = null;
        let tributesToUse = [];

        // Prioridad 1: Si tiene 2+ monstruos en campo y un Nivel 7+ en mano (e.g. Dark Magician, Blue-Eyes)
        if (monstersOnFieldIndices.length >= 2) {
            const highLvl = monstersInHand.find(m => (m.level || 0) >= 7);
            if (highLvl) {
                chosenMonster = highLvl;
                tributesToUse = monstersOnFieldIndices.slice(0, 2);
            }
        }

        // Prioridad 2: Si tiene 1+ monstruos en campo y un Nivel 5-6 en mano (e.g. Summoned Skull, Curse of Dragon)
        if (!chosenMonster && monstersOnFieldIndices.length >= 1) {
            const midLvl = monstersInHand.find(m => (m.level || 0) === 5 || (m.level || 0) === 6);
            if (midLvl) {
                chosenMonster = midLvl;
                tributesToUse = [monstersOnFieldIndices[0]];
            }
        }

        // Prioridad 3: Invocación normal sin sacrificio (Nivel 1 a 4) si hay ranuras vacías
        if (!chosenMonster && emptyMonsterSlots.length > 0) {
            const lowLvl = monstersInHand.find(m => (m.level || 4) <= 4);
            if (lowLvl) {
                chosenMonster = lowLvl;
                tributesToUse = [];
            }
        }

        // Ejecutar invocación legal si se cumplen todos los sacrificios requeridos
        if (chosenMonster) {
            // Sacrificar monstruos requeridos
            tributesToUse.forEach(slotIdx => {
                const sacrificed = npc.monsters[slotIdx];
                sendCardToGraveyard(duelState, sacrificed, 'player2');
                npc.monsters[slotIdx] = null;
            });

            // Encontrar casilla libre (incluyendo las recién liberadas por sacrificio)
            const summonSlot = npc.monsters.findIndex(m => m === null);
            if (summonSlot !== -1) {
                npc.hand.splice(chosenMonster.handIdx, 1);
                // Si el monstruo tiene buen ATK (>= 1000) o ATK >= DEF, invocar en ATK para poder combatir
                const isDef = (chosenMonster.atk || 0) < 1000 && (chosenMonster.def || 0) > (chosenMonster.atk || 0);

                npc.monsters[summonSlot] = {
                    card_id: chosenMonster.id,
                    position: isDef ? 'DEF' : 'ATK',
                    faceDown: isDef,
                    hasAttacked: false,
                    turnSummoned: duelState.turnNumber,
                    hasChangedPosition: false,
                    card_data: chosenMonster
                };

                if (tributesToUse.length > 0) {
                    emitDuelLog(roomId, `⭐ [Sacrificio Rival] ${npc.username} tributa ${tributesToUse.length} monstruo(s) para invocar a ${chosenMonster.name} (Nv. ${chosenMonster.level})!`, 'tribute');
                } else {
                    emitDuelLog(roomId, `⚔️ [Invocación Rival] ${npc.username} invoca a ${chosenMonster.name} en Modo ${isDef ? 'Defensa' : 'Ataque'}.`, 'summon');
                }
            }
        }

        // 2.5 Colocar Magia/Trampa en ranura libre (0..4)
        const emptySpellIndex = npc.spells.findIndex(s => s === null);
        const spellInHandIdx = npc.hand.findIndex(c => c.type && (c.type.includes('Spell') || c.type.includes('Trap')));

        if (emptySpellIndex !== -1 && spellInHandIdx !== -1) {
            const cardToSet = npc.hand.splice(spellInHandIdx, 1)[0];
            npc.spells[emptySpellIndex] = {
                card_id: cardToSet.id,
                position: 'SET',
                faceDown: true,
                card_data: cardToSet
            };
            emitDuelLog(roomId, `🎴 [Rival SET] ${npc.username} coloca una carta boca abajo en su Zona Mágica.`, 'spell');
        }

        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
        await new Promise(r => setTimeout(r, 1200));

        // 3. BATTLE PHASE del NPC
        // REGLA OFICIAL OCG: El primer jugador NO puede atacar en el Turno 1
        if (duelState.turnNumber > 1) {
            duelState.phase = 'BATTLE';
            emitDuelLog(roomId, `⚔️ [Rival] BATTLE PHASE.`, 'phase');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            await new Promise(r => setTimeout(r, 800));

            for (let slot = 0; slot < 5; slot++) {
                const attacker = npc.monsters[slot];
                if (!attacker || attacker.position !== 'ATK' || attacker.hasAttacked) continue;

                // REGLA OFICIAL OCG: Si el monstruo está encadenado o tiene restricción continua de ataque
                if (attacker.isTrapped || (attacker.attachedEffects && attacker.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'))) {
                    console.log(`[OCG BATTLE] ${attacker.card_data.name} (NPC) no puede atacar: inmovilizado.`);
                    continue;
                }

                const attackerAtk = attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.card_data.atk || 0);
                const playerHasMonsters = player.monsters.some(m => m !== null);

                let targetIdx = -1;

                if (playerHasMonsters) {
                    // Estrategia de Selección de Objetivo OCG Inteligente:
                    // 1. Buscar monstruos rivales en ATK que podamos destruir con menor o igual ATK
                    let bestAtkTarget = -1;
                    let maxDamage = -1;
                    for (let pSlot = 0; pSlot < 5; pSlot++) {
                        const pm = player.monsters[pSlot];
                        if (pm && pm.position === 'ATK') {
                            const pAtk = pm.currentAtk !== undefined ? pm.currentAtk : (pm.card_data.atk || 0);
                            if (attackerAtk >= pAtk) {
                                const dmg = attackerAtk - pAtk;
                                if (dmg > maxDamage) {
                                    maxDamage = dmg;
                                    bestAtkTarget = pSlot;
                                }
                            }
                        }
                    }

                    if (bestAtkTarget !== -1) {
                        targetIdx = bestAtkTarget;
                    } else {
                        // 2. Buscar monstruos rivales en DEF boca arriba que podamos destruir
                        let bestDefTarget = -1;
                        for (let pSlot = 0; pSlot < 5; pSlot++) {
                            const pm = player.monsters[pSlot];
                            if (pm && pm.position === 'DEF' && !pm.faceDown) {
                                const pDef = pm.currentDef !== undefined ? pm.currentDef : (pm.card_data.def || 0);
                                if (attackerAtk > pDef) {
                                    bestDefTarget = pSlot;
                                    break;
                                }
                            }
                        }

                        if (bestDefTarget !== -1) {
                            targetIdx = bestDefTarget;
                        } else {
                            // 3. Atacar a monstruo boca abajo si el atacante tiene buen ataque (>= 1000)
                            const faceDownSlot = player.monsters.findIndex(m => m !== null && m.faceDown);
                            if (faceDownSlot !== -1 && attackerAtk >= 1000) {
                                targetIdx = faceDownSlot;
                            }
                        }
                    }

                    // Si no hay objetivo favorable, no atacar para evitar estrellarse contra monstruos superiores
                    if (targetIdx === -1) continue;
                }

                // Ventana de Respuesta OCG al Ataque del Rival (Kuriboh o Trampas/Magias Rápidas)
                const hasKuriboh = player.hand.some(c => (c.id || c.card_id) === 40640057);
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
                    await new Promise(resolve => {
                        roomChainCallbacks.set(roomId, resolve);
                        promptChainWindow(roomId, `¡${npc.username} declara un ataque con ${attacker.card_data.name}!`, attacker.card_data, player.username);
                    });
                }

                if (!npc.monsters[slot] || npc.monsters[slot] !== attacker) {
                    console.log(`[OCG BATTLE] Atacante removido durante la cadena.`);
                    continue;
                }

                if (duelState.pendingAction && duelState.pendingAction.negated) {
                    console.log(`[OCG BATTLE] Ataque anulado.`);
                    attacker.hasAttacked = true;
                    continue;
                }

                const kuribohProtected = (duelState.pendingAction && duelState.pendingAction.kuribohProtected) || duelState.kuribohShieldActive;
                if (duelState.kuribohShieldActive) duelState.kuribohShieldActive = false;

                if (!playerHasMonsters || targetIdx === -1) {
                    // Ataque Directo
                    const dmg = kuribohProtected ? 0 : attackerAtk;
                    player.lp = Math.max(0, player.lp - dmg);
                    attacker.hasAttacked = true;
                    if (kuribohProtected) {
                        emitDuelLog(roomId, `🛡️ ¡Efecto OCG de Kuriboh! El daño directo de ${attacker.card_data.name} fue reducido a 0 LP.`, 'battle');
                    } else {
                        emitDuelLog(roomId, `💥 ¡Ataque Directo de ${attacker.card_data.name} por ${attackerAtk} de daño a tus LP! (LP: ${player.lp})`, 'battle');
                    }
                    if (checkDuelGameOver(roomId, duelState)) return;
                } else {
                    const defender = player.monsters[targetIdx];
                    if (!defender) continue;

                    const defAtk = defender.currentAtk !== undefined ? defender.currentAtk : (defender.card_data.atk || 0);
                    const defDef = defender.currentDef !== undefined ? defender.currentDef : (defender.card_data.def || 0);

                    if (defender.position === 'ATK') {
                        const diff = attackerAtk - defAtk;
                        if (diff > 0) {
                            sendCardToGraveyard(duelState, defender, 'player1');
                            player.monsters[targetIdx] = null;
                            const dmg = kuribohProtected ? 0 : diff;
                            player.lp = Math.max(0, player.lp - dmg);
                            emitDuelLog(roomId, `⚔️💥 ${attacker.card_data.name} destruye a ${defender.card_data.name} en combate! ${player.username} recibe ${dmg} de daño. (LP: ${player.lp})`, 'battle');
                        } else if (diff === 0) {
                            sendCardToGraveyard(duelState, defender, 'player1');
                            player.monsters[targetIdx] = null;
                            sendCardToGraveyard(duelState, attacker, 'player2');
                            npc.monsters[slot] = null;
                            emitDuelLog(roomId, `⚔️💥 ¡Doble destrucción! ${attacker.card_data.name} y ${defender.card_data.name} se destruyen mutuamente.`, 'battle');
                        } else {
                            sendCardToGraveyard(duelState, attacker, 'player2');
                            npc.monsters[slot] = null;
                            const recoil = Math.abs(diff);
                            npc.lp = Math.max(0, npc.lp - recoil);
                            emitDuelLog(roomId, `⚔️💥 ¡Contragolpe! ${attacker.card_data.name} fue destruido por ${defender.card_data.name}. (LP Rival: ${npc.lp})`, 'battle');
                        }
                    } else {
                        // Defensor en Posición de Defensa
                        const wasFaceDown = defender.faceDown;
                        defender.faceDown = false;

                        if (wasFaceDown) {
                            emitDuelLog(roomId, `🔄 [Volteo en Combate] ¡${defender.card_data.name} fue volteado boca arriba por el ataque de ${attacker.card_data.name}!`, 'position');
                        }

                        // Ejecutar efecto de Volteo si aplica (Regla OCG Damage Step)
                        if (wasFaceDown && defender.card_data) {
                            const flipId = defender.card_id || defender.card_data.id;
                            const isFlip = (defender.card_data.type && typeof defender.card_data.type === 'string' && defender.card_data.type.includes('Flip')) 
                                || (defender.card_data && (Number(defender.card_data.type) & 0x200000)) 
                                || [54652250, 7089711, 9076207, 33066139].includes(flipId);

                            if (isFlip) {
                                emitDuelLog(roomId, `⚡ [Efecto de Volteo] ¡"${defender.card_data.name}" activa su Efecto de Volteo al ser atacado!`, 'effect');
                                enrichDuelStateForBroadcast(duelState);
                                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                                await new Promise(r => setTimeout(r, 600));

                                duelState.pendingAction = { type: 'ATTACK', attackerSlot: slot };
                                await executeCardEffect(roomId, defender.card_data, 'player1', 'player2', {
                                    slot_index: slot,
                                    target_slot: slot,
                                    target_player: 'player2'
                                });
                                duelState.pendingAction = null;
                            }
                        }

                        // Resolución de destrucción por batalla
                        if (!npc.monsters[slot]) {
                            emitDuelLog(roomId, `⚔️ El atacante fue removido del campo por el efecto de volteo.`, 'battle');
                        } else if (attackerAtk > defDef) {
                            sendCardToGraveyard(duelState, defender, 'player1');
                            player.monsters[targetIdx] = null;
                            emitDuelLog(roomId, `⚔️🛡️ ${attacker.card_data.name} pulveriza la defensa de ${defender.card_data.name} y lo envía al Cementerio.`, 'battle');
                        } else if (defDef > attackerAtk) {
                            const recoil = defDef - attackerAtk;
                            npc.lp = Math.max(0, npc.lp - recoil);
                            emitDuelLog(roomId, `⚔️🛡️ ¡Defensa superior! ${defender.card_data.name} resiste el ataque. ${npc.username} recibe ${recoil} de daño reflejado. (LP: ${npc.lp})`, 'battle');
                        } else {
                            emitDuelLog(roomId, `⚔️🛡️ Ataque empatado contra la defensa de ${defender.card_data.name}. Ningún monstruo es destruido.`, 'battle');
                        }
                    }

                    if (npc.monsters[slot]) {
                        attacker.hasAttacked = true;
                    }
                }

                if (checkDuelGameOver(roomId, duelState)) return;
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                await new Promise(r => setTimeout(r, 800));
            }
        } else {
    emitDuelLog(roomId, `⏱️ [Regla Oficial Konami] ${npc.username} no puede entrar en Battle Phase ni atacar en el Turno 1. Pasando a End Phase.`, 'phase');
}

    // 4. END PHASE del NPC
    duelState.phase = 'END';
    emitDuelLog(roomId, `⏱️ [Rival] END PHASE.`, 'phase');
    enrichDuelStateForBroadcast(duelState);
    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

    await new Promise(r => setTimeout(r, 1200));

    // Validación oficial de mano de NPC (límite 6 cartas)
    if (npc.hand.length > 6) {
        const excess = npc.hand.length - 6;
        for (let i = 0; i < excess; i++) {
            if (npc.hand.length > 0) {
                const disc = npc.hand.pop();
                sendCardToGraveyard(duelState, disc, 'player2');
            }
        }
        emitDuelLog(roomId, `📦 [Regla de Mano] ${npc.username} descartó ${excess} carta(s) al Cementerio por límite de 6 cartas.`, 'phase');
    }

    // Restablecer ataques de monstruos, efectos de ignición, cambio de posición y permiso de invocación
    for (let i = 0; i < 5; i++) {
        if (player.monsters[i]) {
            player.monsters[i].hasAttacked = false;
            player.monsters[i].hasUsedEffect = false;
            player.monsters[i].hasChangedPosition = false;
        }
        if (npc.monsters[i]) {
            npc.monsters[i].hasAttacked = false;
            npc.monsters[i].hasUsedEffect = false;
            npc.monsters[i].hasChangedPosition = false;
        }
    }
    duelState.normalSummonUsed = false;

    // 5. Ceder Turno al Jugador
    duelState.turnPlayer = player.username;
    duelState.turnNumber++;
    duelState.phase = 'DRAW';
    emitDuelLog(roomId, `⏳ [Turno ${duelState.turnNumber}] Turno de ${player.username} (DRAW PHASE).`, 'phase');

    // Robo del jugador en Draw Phase (con regla oficial OCG de Deck Out)
    if (checkDeckOut(roomId, duelState, 'player1')) return;
    const drawn = player.deck.pop();
    player.hand.push(drawn);
    player.mainDeckCount = player.deck.length;
    emitDuelLog(roomId, `🃏 ${player.username} roba 1 carta en su Draw Phase.`, 'draw');

    enrichDuelStateForBroadcast(duelState);
    if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

    // Auto-avanzar al Standby y luego Main Phase 1 para el jugador
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
                }
            }, 800);
        }
    }, 1000);
    } catch (err) {
        console.error('[NPC AI ERROR]', err);
    }
}

function finalizeTurnHandoffToRival(roomId) {
    const duelState = duelRooms.get(roomId);
    if (!duelState) return;
    const p1 = duelState.player1;
    const p2 = duelState.player2;

    setTimeout(() => {
        // Restablecer ataques de monstruos, efectos de ignición, cambios de posición y permiso de invocación
        for (let i = 0; i < 5; i++) {
            if (p1.monsters[i]) {
                p1.monsters[i].hasAttacked = false;
                p1.monsters[i].hasUsedEffect = false;
                p1.monsters[i].hasChangedPosition = false;
            }
            if (p2.monsters[i]) {
                p2.monsters[i].hasAttacked = false;
                p2.monsters[i].hasUsedEffect = false;
                p2.monsters[i].hasChangedPosition = false;
            }
        }
        duelState.normalSummonUsed = false;

        // Cambio de Turno al Rival (NPC o Jugador 2)
        duelState.turnPlayer = p2.username;
        duelState.turnNumber++;
        duelState.phase = 'DRAW';

        emitDuelLog(roomId, `⏳ [Turno ${duelState.turnNumber}] Turno de ${p2.username} (DRAW PHASE).`, 'phase');

        // Robo del Rival en Draw Phase (con regla oficial OCG de Deck Out)
        if (checkDeckOut(roomId, duelState, 'player2')) return;
        const drawn = p2.deck.pop();
        p2.hand.push(drawn);
        p2.mainDeckCount = p2.deck.length;
        emitDuelLog(roomId, `🃏 ${p2.username} roba 1 carta en su Draw Phase.`, 'draw');

        enrichDuelStateForBroadcast(duelState);
        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

        // Ejecutar Turno de la IA del NPC
        if (isNpcOpponent(p2)) {
            console.log(`[NPC AI] Turno entregado a ${p2.username}. Programando turno de IA...`);
            setTimeout(() => executeNpcTurn(roomId), 1200);
        }
    }, 1000);
}

let isChatMuted = false;

module.exports = {
    executeNpcTurn,
    finalizeTurnHandoffToRival,
    isNpcOpponent
};
