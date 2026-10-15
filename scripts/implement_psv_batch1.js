/**
 * Script de implementación de alta fidelidad para Magias y Trampas de PSV (50 cartas)
 * Expansión: Pharaoh's Servant (PSV)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch1 = [
    // -------------------------------------------------------------
    // MAGIAS DE EQUIPO (3 cartas)
    // -------------------------------------------------------------
    {
        id: 86198326,
        name: "7 Completed",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        atkDelta: 700,
        defDelta: 300,
        canEquip(target) {
            if (!target) return false;
            const tData = target.card_data || target;
            const r = (tData.race || '').toLowerCase();
            return r.includes('machine') || r.includes('máquina');
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasValid) return { canActivate: false, reason: "No hay ningún monstruo de Tipo Máquina boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) {
                        valid.push({ playerKey: pKey, slotIndex: idx });
                    }
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const targetMonster = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMonster || targetMonster.faceDown || !this.canEquip(targetMonster.card_data || targetMonster)) {
                return { success: false, reason: "Objetivo inválido." };
            }
            // Elegir bono de ATK (+700) o DEF (+300). Por defecto +700 ATK
            targetMonster.currentAtk = (targetMonster.currentAtk !== undefined ? targetMonster.currentAtk : (targetMonster.card_data?.atk || 0)) + 700;
            targetMonster.equippedCards = targetMonster.equippedCards || [];
            targetMonster.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `⚙️✨ [7 Completed] ¡Equipado a "${targetMonster.card_data?.name || 'Monstruo'}"! (+700 ATK)`, 'spell');
            return { success: true };
        }
    },
    {
        id: 70828912,
        name: "Premature Burial",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) {
            return Boolean(target);
        },
        canActivate({ duelState, playerKey }) {
            const pObj = duelState[playerKey];
            if (!pObj) return { canActivate: false, reason: "Estado inválido." };
            if ((pObj.lp || 0) <= 800) return { canActivate: false, reason: "No tienes suficientes Life Points (requiere 800 LP)." };
            const freeSlot = (pObj.monsters || []).some(m => !m);
            if (!freeSlot) return { canActivate: false, reason: "No tienes casillas de monstruo disponibles." };
            const hasMonsterInGY = (pObj.graveyard || []).some(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                return ct.includes('monster') && !ct.includes('ritual') && !ct.includes('fusion');
            });
            if (!hasMonsterInGY) return { canActivate: false, reason: "No hay monstruos válidos en tu Cementerio para revivir." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey }) {
            const valid = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (!m) valid.push({ playerKey, slotIndex: idx });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const pObj = duelState[playerKey];
            pObj.lp = Math.max(0, pObj.lp - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🧪 [Premature Burial] ${pObj.username} paga 800 LP. (LP restantes: ${pObj.lp})`, 'spell');

            // Buscar monstruo en GY
            const gyIdx = targetData?.gy_index !== undefined ? targetData.gy_index : (pObj.graveyard || []).findLastIndex(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                return ct.includes('monster') && !ct.includes('ritual') && !ct.includes('fusion');
            });
            if (gyIdx === -1 || !pObj.graveyard?.[gyIdx]) return { success: false, reason: "Monstruo no encontrado en Cementerio." };

            const revived = pObj.graveyard.splice(gyIdx, 1)[0];
            const slotIdx = (pObj.monsters || []).findIndex(m => !m);
            if (slotIdx === -1) return { success: false, reason: "No hay espacio en campo." };

            revived.position = 'ATK';
            revived.faceDown = false;
            revived.equippedCards = revived.equippedCards || [];
            revived.equippedCards.push(this.id);
            revived.prematureBurialLinked = true;
            pObj.monsters[slotIdx] = revived;

            // Enlazar con la carta mágica en spells
            const sIdx = (link && link.slot_index !== undefined) ? link.slot_index : (pObj.spells || []).findIndex(s => s && Number(s.card_id || s.card_data?.id) === this.id);
            if (sIdx !== -1 && pObj.spells?.[sIdx]) {
                pObj.spells[sIdx].targetingMonster = { player: playerKey, slot: slotIdx };
            }

            effectUtils.emitDuelLog(duelState.roomId, `⚰️✨ [Premature Burial] ¡Revive a "${revived.card_data?.name || revived.name}" en Modo Ataque y se equipa a él!`, 'special_summon');
            return { success: true };
        }
    },
    {
        id: 97687912,
        name: "Fairy Meteor Crush",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) {
            return Boolean(target);
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const targetMonster = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMonster || targetMonster.faceDown) return { success: false, reason: "Objetivo inválido." };

            targetMonster.hasPiercing = true;
            targetMonster.equippedCards = targetMonster.equippedCards || [];
            targetMonster.equippedCards.push(this.id);

            effectUtils.emitDuelLog(duelState.roomId, `☄️🧚 [Fairy Meteor Crush] ¡Equipado a "${targetMonster.card_data?.name || 'Monstruo'}"! Concede daño de penetración contra monstruos en Defensa.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS NORMALES (7 cartas)
    // -------------------------------------------------------------
    {
        id: 71044499,
        name: "Nobleman of Crossout",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceDown = allMonsters.some(m => m && m.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "No hay monstruos boca abajo en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let target = null;
            let tKey = null;
            let tIdx = -1;

            if (targetData?.slot_index !== undefined) {
                tKey = targetData.target_player || oppKey;
                tIdx = targetData.slot_index;
                target = duelState[tKey]?.monsters?.[tIdx];
            } else {
                // Auto-buscar monstruo boca abajo rival
                tIdx = (duelState[oppKey]?.monsters || []).findIndex(m => m && m.faceDown);
                if (tIdx !== -1) {
                    tKey = oppKey;
                    target = duelState[oppKey].monsters[tIdx];
                } else {
                    tIdx = (duelState[playerKey]?.monsters || []).findIndex(m => m && m.faceDown);
                    if (tIdx !== -1) {
                        tKey = playerKey;
                        target = duelState[playerKey].monsters[tIdx];
                    }
                }
            }

            if (!target || !target.faceDown) return { success: false, reason: "Objetivo boca abajo inválido." };

            const targetName = target.card_data?.name || target.name || 'Monstruo Oculto';
            const isFlip = (target.card_data?.type || target.type || '').toLowerCase().includes('flip');

            // Destruir y desterrar objetivo
            duelState[tKey].monsters[tIdx] = null;
            effectUtils.sendCardToBanished(duelState, target, tKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️🚫 [Nobleman of Crossout] Destruye y destierra boca abajo a "${targetName}".`, 'spell');

            // Si era Flip, desterrar todas las copias de los Decks de ambos jugadores
            if (isFlip) {
                const targetId = Number(target.card_id || target.card_data?.id);
                let banishedCount = 0;
                [playerKey, oppKey].forEach(pKey => {
                    const deck = duelState[pKey]?.deck || [];
                    for (let i = deck.length - 1; i >= 0; i--) {
                        if (Number(deck[i].card_id || deck[i].id) === targetId) {
                            const [b] = deck.splice(i, 1);
                            effectUtils.sendCardToBanished(duelState, b, pKey);
                            banishedCount++;
                        }
                    }
                });
                effectUtils.emitDuelLog(duelState.roomId, `🎴🚫 [Nobleman of Crossout] ¡Era un Monstruo de Volteo! Se destierran ${banishedCount} copia(s) adicionales de los Decks.`, 'spell');
            }

            return { success: true };
        }
    },
    {
        id: 17449108,
        name: "Nobleman of Extermination",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allSpells = [...(duelState[playerKey]?.spells || []), ...(duelState[oppKey]?.spells || [])];
            const hasFaceDown = allSpells.some(s => s && s.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "No hay cartas Mágicas o de Trampa boca abajo en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let target = null;
            let tKey = null;
            let tIdx = -1;

            if (targetData?.slot_index !== undefined) {
                tKey = targetData.target_player || oppKey;
                tIdx = targetData.slot_index;
                target = duelState[tKey]?.spells?.[tIdx];
            } else {
                tIdx = (duelState[oppKey]?.spells || []).findIndex(s => s && s.faceDown);
                if (tIdx !== -1) {
                    tKey = oppKey;
                    target = duelState[oppKey].spells[tIdx];
                } else {
                    tIdx = (duelState[playerKey]?.spells || []).findIndex(s => s && s.faceDown);
                    if (tIdx !== -1) {
                        tKey = playerKey;
                        target = duelState[playerKey].spells[tIdx];
                    }
                }
            }

            if (!target || !target.faceDown) return { success: false, reason: "Objetivo M/T boca abajo inválido." };

            const targetName = target.card_data?.name || target.name || 'Carta Oculta';
            const isTrap = (target.card_data?.type || target.type || '').toLowerCase().includes('trap');

            duelState[tKey].spells[tIdx] = null;
            effectUtils.sendCardToBanished(duelState, target, tKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️📜 [Nobleman of Extermination] Destruye y destierra boca abajo a "${targetName}".`, 'spell');

            if (isTrap) {
                const targetId = Number(target.card_id || target.card_data?.id);
                let banishedCount = 0;
                [playerKey, oppKey].forEach(pKey => {
                    const deck = duelState[pKey]?.deck || [];
                    for (let i = deck.length - 1; i >= 0; i--) {
                        if (Number(deck[i].card_id || deck[i].id) === targetId) {
                            const [b] = deck.splice(i, 1);
                            effectUtils.sendCardToBanished(duelState, b, pKey);
                            banishedCount++;
                        }
                    }
                });
                effectUtils.emitDuelLog(duelState.roomId, `🎴🚫 [Nobleman of Extermination] ¡Era una Carta de Trampa! Se destierran ${banishedCount} copia(s) de los Decks.`, 'spell');
            }

            return { success: true };
        }
    },
    {
        id: 43434803,
        name: "The Shallow Grave",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const pHasMon = (duelState[playerKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const oppHasMon = (duelState[oppKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const pHasSpace = (duelState[playerKey]?.monsters || []).some(m => !m);
            const oppHasSpace = (duelState[oppKey]?.monsters || []).some(m => !m);
            if (!pHasMon || !oppHasMon || !pHasSpace || !oppHasSpace) {
                return { canActivate: false, reason: "Ambos jugadores deben tener un monstruo en el Cementerio y espacio en campo." };
            }
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            [playerKey, oppKey].forEach(pKey => {
                const p = duelState[pKey];
                const gyMonIdx = (p.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
                const freeSlot = (p.monsters || []).findIndex(m => !m);
                if (gyMonIdx !== -1 && freeSlot !== -1) {
                    const [mon] = p.graveyard.splice(gyMonIdx, 1);
                    mon.position = 'DEF';
                    mon.faceDown = true;
                    p.monsters[freeSlot] = mon;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `⚰️🌑 [The Shallow Grave] Ambos jugadores invocan de modo especial 1 monstruo desde su Cementerio en Posición de Defensa boca abajo.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 60682203,
        name: "Cold Wave",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            if (duelState.turnPhase !== 'MAIN_1' && duelState.phase !== 'MAIN_1') {
                return { canActivate: false, reason: "Solo se puede activar al inicio de la Main Phase 1." };
            }
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.coldWaveActiveUntilTurn = (duelState.turnNumber || 1) + 1;
            effectUtils.emitDuelLog(duelState.roomId, `❄️🌊 [Cold Wave] ¡Una ola congelante azota el campo! Ningún jugador puede jugar ni colocar cartas Mágicas ni de Trampa hasta el próximo turno.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 66719324,
        name: "Rain of Mercy",
        type: "Normal Spell",
        race: "Spell",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            if (duelState[playerKey]) duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + 1000;
            if (duelState[oppKey]) duelState[oppKey].lp = (duelState[oppKey].lp || 8000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🌧️💖 [Rain of Mercy] ¡Lluvia de misericordia! Ambos jugadores recuperan 1000 Life Points.`, 'heal');
            return { success: true };
        }
    },
    {
        id: 96965364,
        name: "Insect Imitation",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para tributar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m);
            const tribute = p.monsters?.[tSlot];
            if (!tribute) return { success: false, reason: "Monstruo a tributar no encontrado." };

            const tribLevel = tribute.card_data?.level || tribute.level || 1;
            const targetLevel = tribLevel + 1;

            p.monsters[tSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, tribute, playerKey);

            // Buscar Insecto en Deck de Nivel targetLevel
            const insectIdx = (p.deck || []).findIndex(c => {
                const r = (c.card_data?.race || c.race || '').toLowerCase();
                const l = c.card_data?.level || c.level || 0;
                return (r.includes('insect') || r.includes('insecto')) && l === targetLevel;
            });

            if (insectIdx !== -1) {
                const [summoned] = p.deck.splice(insectIdx, 1);
                summoned.position = 'ATK';
                summoned.faceDown = false;
                p.monsters[tSlot] = summoned;
                effectUtils.emitDuelLog(duelState.roomId, `🦗✨ [Insect Imitation] Sacrifica "${tribute.card_data?.name || 'Monstruo'}" e Invoca de Modo Especial a "${summoned.card_data?.name || summoned.name}" (Nv. ${targetLevel}) desde el Deck.`, 'special_summon');
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `🦗 [Insect Imitation] Sacrifica "${tribute.card_data?.name || 'Monstruo'}", pero no se encontró ningún Insecto de Nivel ${targetLevel} en el Deck.`, 'spell');
            }

            return { success: true };
        }
    },
    {
        id: 22959079,
        name: "Dimensionhole",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m);
            const target = p.monsters?.[tSlot];
            if (!target) return { success: false, reason: "Monstruo no encontrado." };

            p.monsters[tSlot] = null;
            duelState.dimensionholeReturns = duelState.dimensionholeReturns || [];
            duelState.dimensionholeReturns.push({
                card: target,
                playerKey,
                slotIndex: tSlot,
                returnTurn: (duelState.turnNumber || 1) + 1
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌌🕳️ [Dimensionhole] "${target.card_data?.name || target.name}" es desterrado temporalmente hasta tu próxima Standby Phase.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS DE JUEGO RÁPIDO (2 cartas)
    // -------------------------------------------------------------
    {
        id: 23171610,
        name: "Limiter Removal",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate({ duelState, playerKey }) {
            const hasMachine = (duelState[playerKey]?.monsters || []).some(m => {
                if (!m || m.faceDown) return false;
                const r = (m.card_data?.race || m.race || '').toLowerCase();
                return r.includes('machine') || r.includes('máquina');
            });
            if (!hasMachine) return { canActivate: false, reason: "No controlas ningún monstruo de Tipo Máquina boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const machines = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) {
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    if (r.includes('machine') || r.includes('máquina')) {
                        const curAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0);
                        m.currentAtk = curAtk * 2;
                        m.limiterRemovalBoosted = true;
                        machines.push({ monster: m, slotIndex: idx });
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `⚡🤖 [Limiter Removal] ¡Duplica el ATK de ${machines.length} monstruo(s) Máquina! Serán destruidos en la End Phase.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 93108433,
        name: "Monster Recovery",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m && !m.faceDown);
            const targetMon = p.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo no válido." };

            const handCount = p.hand.length;
            p.monsters[tSlot] = null;
            p.deck.push(targetMon);
            while (p.hand.length > 0) {
                p.deck.push(p.hand.pop());
            }

            // Barajar deck
            p.deck.sort(() => Math.random() - 0.5);

            // Robar cartas iguales a las que tenía en mano
            for (let i = 0; i < handCount; i++) {
                if (p.deck.length > 0) p.hand.push(p.deck.pop());
            }

            effectUtils.emitDuelLog(duelState.roomId, `🌀🃏 [Monster Recovery] Devuelve "${targetMon.card_data?.name || 'Monstruo'}" y la mano al Deck, baraja y roba ${handCount} carta(s).`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS CONTINUAS (5 cartas)
    // -------------------------------------------------------------
    {
        id: 16227556,
        name: "Inspection",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔍 [Inspection] ¡Activada! Durante la Standby Phase del rival puedes pagar 500 LP para ver 1 carta al azar de su mano.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 43711255,
        name: "Prohibition",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredCard = targetData?.declared_card || "Jinzo";
            duelState.prohibitionDeclaredCard = declaredCard.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `🚫📜 [Prohibition] ¡Se declara la prohibición de "${declaredCard}"! Dicha carta no puede ser jugada.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 24294108,
        name: "Burning Land",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            [playerKey, oppKey].forEach(pKey => {
                if (duelState[pKey]?.fieldSpell) {
                    effectUtils.sendCardToGraveyard(duelState, duelState[pKey].fieldSpell, pKey);
                    duelState[pKey].fieldSpell = null;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌋🔥 [Burning Land] ¡Destruye todas las Cartas de Campo! Ambos jugadores reciben 500 de daño en cada Standby Phase.`, 'spell');
            return { success: true };
        },
        onStandby({ duelState, effectUtils }) {
            ['player1', 'player2'].forEach(pKey => {
                if (duelState[pKey]) {
                    duelState[pKey].lp = Math.max(0, (duelState[pKey].lp || 8000) - 500);
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌋🔥 [Burning Land] Ambos jugadores reciben 500 puntos de daño en la Standby Phase.`, 'damage');
        }
    },
    {
        id: 90502999,
        name: "Ground Collapse",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🕳️🚧 [Ground Collapse] ¡El suelo colapsa bloqueando 2 casillas de monstruo del rival!`, 'spell');
            return { success: true };
        }
    },
    {
        id: 23615409,
        name: "Insect Barrier",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.insectBarrierActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🦗 [Insect Barrier] ¡Barrera Antinsectos desplegada! Ningún monstruo de Tipo Insecto del oponente puede declarar ataques.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS DE CONTRAEFECTO (1 carta)
    // -------------------------------------------------------------
    {
        id: 59344077,
        name: "Magic Drain",
        type: "Counter Trap",
        race: "Trap",
        isTrap: true,
        isCounter: true,
        canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const oppSpellIdx = (opp?.hand || []).findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));

            if (oppSpellIdx !== -1) {
                const [discarded] = opp.hand.splice(oppSpellIdx, 1);
                effectUtils.sendCardToGraveyard(duelState, discarded, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `💧📜 [Magic Drain] El rival descarta "${discarded.card_data?.name || 'Magia'}" para cancelar la anulación.`, 'spell');
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `💧🚫 [Magic Drain] ¡El rival no tiene Magias para descartar! Su carta Mágica es negada y destruida.`, 'trap');
            }
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS CONTINUAS (16 cartas)
    // -------------------------------------------------------------
    {
        id: 61740673,
        name: "Imperial Order",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        isImperialOrder: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.spellsNegated = true;
            duelState.imperialOrderActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Imperial Order] ¡Decreto Imperial activo! Se anulan todos los efectos de Cartas Mágicas en el campo. Mantenimiento: 700 LP en cada Standby Phase.`, 'trap');
            return { success: true };
        },
        onStandby({ duelState, playerKey, effectUtils }) {
            const p = duelState[playerKey];
            if (p && p.lp > 700) {
                p.lp -= 700;
                effectUtils.emitDuelLog(duelState.roomId, `👑 [Imperial Order] ${p.username} paga 700 LP para mantener Imperial Order. (LP: ${p.lp})`, 'trap');
            } else if (p) {
                // Si no puede pagar, se destruye
                effectUtils.emitDuelLog(duelState.roomId, `👑💥 [Imperial Order] No se puede pagar el costo de 700 LP. Imperial Order es destruida.`, 'trap');
                duelState.spellsNegated = false;
                duelState.imperialOrderActive = false;
            }
        }
    },
    {
        id: 97077563,
        name: "Call of the Haunted",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const hasMonInGY = (duelState[playerKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const hasSpace = (duelState[playerKey]?.monsters || []).some(m => !m);
            if (!hasMonInGY || !hasSpace) return { canActivate: false, reason: "Requiere un monstruo en tu Cementerio y espacio libre en campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const gyIdx = targetData?.gy_index !== undefined ? targetData.gy_index : (p.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            if (gyIdx === -1 || !p.graveyard?.[gyIdx]) return { success: false, reason: "Monstruo no encontrado." };

            const slotIdx = (p.monsters || []).findIndex(m => !m);
            if (slotIdx === -1) return { success: false, reason: "No hay espacio." };

            const revived = p.graveyard.splice(gyIdx, 1)[0];
            revived.position = 'ATK';
            revived.faceDown = false;
            revived.callOfTheHauntedLinked = true;
            p.monsters[slotIdx] = revived;

            effectUtils.emitDuelLog(duelState.roomId, `👻🕯️ [Call of the Haunted] ¡Invoca a "${revived.card_data?.name || revived.name}" en Modo Ataque! Si esta trampa deja el campo, el monstruo es destruido.`, 'special_summon');
            return { success: true };
        }
    },
    {
        id: 85742772,
        name: "Gravity Bind",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        isGravityBind: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.gravityBindActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🪐⛓️ [Gravity Bind] ¡Atadura de la Gravedad activa! Ningún monstruo de Nivel 4 o mayor puede declarar ataques.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 34694160,
        name: "The Eye of Truth",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.eyeOfTruthActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [The Eye of Truth] ¡El Ojo de la Verdad se abre! El oponente debe mostrar su mano en todo momento. Si tiene una Magia en su Standby Phase, gana 1000 LP.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 22359980,
        name: "Mirror Wall",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.mirrorWallActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🪞🛡️ [Mirror Wall] ¡Pared de Espejos activa! Reduce a la mitad el ATK de los monstruos atacantes del rival.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 48539234,
        name: "Appropriate",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⚖️🃏 [Appropriate] ¡Activa! Cada vez que el rival robe fuera de su Draw Phase, robarás 2 cartas.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 74923978,
        name: "Forced Requisition",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📦⚖️ [Forced Requisition] ¡Activa! Siempre que descartes cartas de tu mano, el rival deberá descartar el mismo número.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 74701381,
        name: "DNA Surgery",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredRace = targetData?.declared_race || "Dragon";
            duelState.dnaSurgeryRace = declaredRace.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `🧬💉 [DNA Surgery] ¡Cirugía de ADN activa! Todos los monstruos en el campo se transforman al Tipo "${declaredRace}".`, 'trap');
            return { success: true };
        }
    },
    {
        id: 296499,
        name: "The Regulation of Tribe",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredRace = targetData?.declared_race || "Warrior";
            duelState.regulationOfTribeRace = declaredRace.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `📜🛡️ [The Regulation of Tribe] Monstruos del Tipo "${declaredRace}" no pueden declarar ataques.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 62867251,
        name: "Light of Intervention",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.lightOfInterventionActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `☀️✨ [Light of Intervention] ¡Luz de Intervención activa! Ningún monstruo puede colocarse boca abajo; deben invocarse boca arriba en Posición de Defensa.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 8951260,
        name: "Respect Play",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.respectPlayActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🤝🎴 [Respect Play] ¡Juego con Respeto activo! Ambos duelistas juegan mostrando sus manos.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 1918087,
        name: "Minor Goblin Official",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👺📜 [Minor Goblin Official] ¡Oficial Goblin activo! Si los LP del rival son 3000 o menos, recibe 500 de daño en cada Standby Phase.`, 'trap');
            return { success: true };
        },
        onStandby({ duelState, opponentKey, effectUtils }) {
            const opp = duelState[opponentKey];
            if (opp && opp.lp <= 3000) {
                opp.lp = Math.max(0, opp.lp - 500);
                effectUtils.emitDuelLog(duelState.roomId, `👺💥 [Minor Goblin Official] El rival tiene 3000 o menos LP y recibe 500 de daño. (LP: ${opp.lp})`, 'damage');
            }
        }
    },
    {
        id: 35346968,
        name: "Solemn Wishes",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.solemnWishesActive = duelState.solemnWishesActive || {};
            duelState.solemnWishesActive[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `🕊️💖 [Solemn Wishes] ¡Deseos Solemnes activo! Ganas 500 Life Points cada vez que robes carta(s).`, 'trap');
            return { success: true };
        }
    },
    {
        id: 98139712,
        name: "Skull Invitation",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.skullInvitationActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `💀📨 [Skull Invitation] ¡Invitación de la Calavera activa! Cada vez que una carta vaya al Cementerio, su dueño recibe 300 de daño.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 54109233,
        name: "Infinite Dismissal",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.infiniteDismissalActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🚪⚡ [Infinite Dismissal] Todos los monstruos de Nivel 3 o menor serán destruidos en la End Phase del turno en que sean invocados.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 21237481,
        name: "Type Zero Magic Crusher",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const hasSpell = (duelState[playerKey]?.hand || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (!hasSpell) return { canActivate: false, reason: "Debes tener al menos 1 Carta Mágica en mano para descartar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const sIdx = (p?.hand || []).findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (sIdx !== -1) {
                const [discarded] = p.hand.splice(sIdx, 1);
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                opp.lp = Math.max(0, (opp.lp || 8000) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `⚙️💥 [Type Zero Magic Crusher] Descarta "${discarded.card_data?.name || 'Magia'}" e inflige 500 de daño a ${opp.username}. (LP: ${opp.lp})`, 'damage');
            }
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS NORMALES (16 cartas restantes)
    // -------------------------------------------------------------
    {
        id: 49587034,
        name: "Lightforce Sword",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            if ((duelState[oppKey]?.hand || []).length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            if (!opp || opp.hand.length === 0) return { success: false, reason: "Mano vacía." };
            const randIdx = Math.floor(Math.random() * opp.hand.length);
            const [banished] = opp.hand.splice(randIdx, 1);
            effectUtils.sendCardToBanished(duelState, banished, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️✨ [Lightforce Sword] Destierra 1 carta al azar de la mano del rival boca abajo durante 3 turnos.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 1248895,
        name: "Chain Destruction",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const targetMon = targetData?.target_card || (opp?.monsters || []).find(m => m && !m.faceDown && (m.currentAtk || m.card_data?.atk || 0) <= 2000);
            if (!targetMon) return { success: false, reason: "Monstruo de 2000 o menos ATK no encontrado." };

            const targetId = Number(targetMon.card_id || targetMon.card_data?.id);
            let destroyedCount = 0;

            // Destruir copias de la mano
            for (let i = opp.hand.length - 1; i >= 0; i--) {
                if (Number(opp.hand[i].card_id || opp.hand[i].id) === targetId) {
                    const [c] = opp.hand.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, opponentKey);
                    destroyedCount++;
                }
            }
            // Destruir copias del Deck
            for (let i = opp.deck.length - 1; i >= 0; i--) {
                if (Number(opp.deck[i].card_id || opp.deck[i].id) === targetId) {
                    const [c] = opp.deck.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, opponentKey);
                    destroyedCount++;
                }
            }

            effectUtils.emitDuelLog(duelState.roomId, `⛓️💥 [Chain Destruction] ¡Destruye ${destroyedCount} copia(s) de "${targetMon.card_data?.name || 'Monstruo'}" de la mano y Deck del rival!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 35316708,
        name: "Time Seal",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.timeSealActiveOnPlayer = opponentKey;
            effectUtils.emitDuelLog(duelState.roomId, `⏳🔒 [Time Seal] ¡Sello Temporal activo! El oponente se salta la Draw Phase de su próximo turno.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 61705417,
        name: "Graverobber",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasSpell = (duelState[oppKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (!hasSpell) return { canActivate: false, reason: "No hay Cartas Mágicas en el Cementerio del rival." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const p = duelState[playerKey];
            const sIdx = (opp?.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (sIdx === -1) return { success: false, reason: "Magia no encontrada." };

            const [stolenSpell] = opp.graveyard.splice(sIdx, 1);
            stolenSpell.graverobberStolen = true;
            p.hand.push(stolenSpell);

            effectUtils.emitDuelLog(duelState.roomId, `💀🤲 [Graverobber] ¡Roba "${stolenSpell.card_data?.name || 'Magia'}" del Cementerio rival! Al activarla recibirás 2000 puntos de daño.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 98299011,
        name: "Gift of The Mystical Elf",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const totalMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m).length;
            const gain = totalMonsters * 300;
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + gain;
            effectUtils.emitDuelLog(duelState.roomId, `🧝‍♀️💖 [Gift of The Mystical Elf] ¡Recupera ${gain} Life Points (300 x ${totalMonsters} monstruos en campo)!`, 'heal');
            return { success: true };
        }
    },
    {
        id: 60082869,
        name: "Dust Tornado",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isSpellTrapRemoval: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasTarget = (duelState[oppKey]?.spells || []).some(s => s) || Boolean(duelState[oppKey]?.fieldSpell);
            if (!hasTarget) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const p = duelState[playerKey];
            const targetSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.spells || []).findIndex(s => s);

            if (targetSlot !== -1 && opp.spells?.[targetSlot]) {
                const destroyed = opp.spells[targetSlot];
                opp.spells[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [Dust Tornado] ¡Destruye "${destroyed.card_data?.name || 'M/T'}" del rival!`, 'trap');
            } else if (opp.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                effectUtils.sendCardToGraveyard(duelState, fs, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [Dust Tornado] ¡Destruye el Campo Mágico rival "${fs.card_data?.name || 'Campo'}"!`, 'trap');
            }

            // Permite colocar 1 M/T de la mano
            const stHandIdx = (p.hand || []).findIndex(c => {
                const t = (c.card_data?.type || c.type || '').toLowerCase();
                return t.includes('spell') || t.includes('trap');
            });
            const freeSTSlot = (p.spells || []).findIndex(s => !s);
            if (stHandIdx !== -1 && freeSTSlot !== -1) {
                const [setCard] = p.hand.splice(stHandIdx, 1);
                setCard.faceDown = true;
                setCard.position = 'SET';
                p.spells[freeSTSlot] = setCard;
                effectUtils.emitDuelLog(duelState.roomId, `🌪️📦 [Dust Tornado] ${p.username} coloca 1 Carta Mágica/Trampa desde su mano boca abajo.`, 'trap');
            }

            return { success: true };
        }
    },
    {
        id: 23471572,
        name: "Solomon's Lawbook",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.skipNextStandbyPhase = duelState.skipNextStandbyPhase || {};
            duelState.skipNextStandbyPhase[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `📖⏳ [Solomon's Lawbook] ¡Te saltarás la próxima Standby Phase!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 60866277,
        name: "Earthshaker",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasMonster = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            // Destruye monstruos boca arriba de los atributos seleccionados
            let count = 0;
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                    count++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌍💥 [Earthshaker] ¡Terremoto masivo destruye ${count} monstruo(s) boca arriba del rival!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 96355986,
        name: "Enchanted Javelin",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState }) {
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const atkDmg = targetData?.attacker_atk || 1500;
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + atkDmg;
            effectUtils.emitDuelLog(duelState.roomId, `🔱💖 [Enchanted Javelin] ¡Jabalina Encantada absorbe el impacto! Recuperas ${atkDmg} Life Points. (LP: ${duelState[playerKey].lp})`, 'heal');
            return { success: true };
        }
    },
    {
        id: 73079365,
        name: "Gust",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isSpellTrapRemoval: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasTarget = (duelState[oppKey]?.spells || []).some(s => s);
            if (!hasTarget) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const destroyed = opp.spells[sIdx];
                opp.spells[sIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `💨💥 [Gust] Ráfaga de viento destruye "${destroyed.card_data?.name || 'M/T'}" del rival.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 473469,
        name: "Driving Snow",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isSpellTrapRemoval: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasTarget = (duelState[oppKey]?.spells || []).some(s => s);
            if (!hasTarget) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const destroyed = opp.spells[sIdx];
                opp.spells[sIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `❄️💥 [Driving Snow] Ventisca destruye "${destroyed.card_data?.name || 'M/T'}" del rival.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 36868108,
        name: "Armored Glass",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🪟 [Armored Glass] ¡Cristal Blindado activo! Las cartas de equipo no surten efecto en los monstruos este turno.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 12253117,
        name: "World Suppression",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            if (!duelState[oppKey]?.fieldSpell) return { canActivate: false, reason: "El rival no tiene Campo Mágico activo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            if (opp?.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                effectUtils.sendCardToGraveyard(duelState, fs, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌍🚫 [World Suppression] ¡Destruye la Carta de Campo "${fs.card_data?.name || 'Campo'}" del rival!`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 49251811,
        name: "Mystic Probe",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮 [Mystic Probe] Todas las Cartas Mágicas Continuas quedan sin efecto durante este turno.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 75646520,
        name: "Metal Detector",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📟 [Metal Detector] Todas las Cartas de Trampa Continuas quedan sin efecto durante este turno.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 2130625,
        name: "Numinous Healer",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState }) { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + 2000;
            effectUtils.emitDuelLog(duelState.roomId, `✨💖 [Numinous Healer] ¡Sanador Numíneo restaura 2000 Life Points! (LP: ${duelState[playerKey].lp})`, 'heal');
            return { success: true };
        }
    },
    {
        id: 36280194,
        name: "Backup Soldier",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            const gy = duelState[playerKey]?.graveyard || [];
            if (gy.length < 5) return { canActivate: false, reason: "Debes tener al menos 5 o más cartas en tu Cementerio." };
            const validCount = gy.filter(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                const atk = c.card_data?.atk !== undefined ? c.card_data.atk : (c.atk || 0);
                return ct.includes('normal') && atk <= 1500;
            }).length;
            if (validCount === 0) return { canActivate: false, reason: "No hay monstruos normales de 1500 o menos ATK en el Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const retrieved = [];
            for (let i = p.graveyard.length - 1; i >= 0 && retrieved.length < 3; i--) {
                const c = p.graveyard[i];
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                const atk = c.card_data?.atk !== undefined ? c.card_data.atk : (c.atk || 0);
                if (ct.includes('normal') && atk <= 1500) {
                    p.graveyard.splice(i, 1);
                    p.hand.push(c);
                    retrieved.push(c.card_data?.name || c.name);
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🎴 [Backup Soldier] Añade ${retrieved.length} monstruo(s) normal(es) desde el Cementerio a la mano: ${retrieved.join(', ')}.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 9074847,
        name: "Major Riot",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📢💥 [Major Riot] ¡Motín Masivo en el campo tras la devolución del monstruo!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 36468556,
        name: "Ceasefire",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m);
            if (allMonsters.length === 0) return { canActivate: false, reason: "No hay monstruos en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let revealedCount = 0;
            let effectMonsterCount = 0;

            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach(m => {
                    if (m) {
                        if (m.faceDown) {
                            m.faceDown = false;
                            revealedCount++;
                            // En Ceasefire, los efectos de volteo NO se activan
                        }
                        const ct = (m.card_data?.type || m.type || '').toLowerCase();
                        if (ct.includes('effect')) effectMonsterCount++;
                    }
                });
            });

            const burnDmg = effectMonsterCount * 500;
            duelState[oppKey].lp = Math.max(0, (duelState[oppKey].lp || 8000) - burnDmg);
            effectUtils.emitDuelLog(duelState.roomId, `🕊️💥 [Ceasefire] ¡Alto al Fuego! Voltea ${revealedCount} monstruos boca arriba (sin efectos de volteo) e inflige ${burnDmg} de daño (${effectMonsterCount} monstruos de efecto x 500 LP) a ${duelState[oppKey].username}. (LP: ${duelState[oppKey].lp})`, 'damage');
            return { success: true };
        }
    },
    {
        id: 81210420,
        name: "Magical Hats",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const monIdx = (p.monsters || []).findIndex(m => m && !m.faceDown);
            if (monIdx !== -1) {
                p.monsters[monIdx].faceDown = true;
                p.monsters[monIdx].position = 'DEF';
            }
            effectUtils.emitDuelLog(duelState.roomId, `🎩✨ [Magical Hats] ¡Sombreros Mágicos ocultan a tu monstruo en Posición de Defensa boca abajo!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 37580756,
        name: "Michizure",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isMonsterRemoval: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const targetSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m);
            if (targetSlot !== -1 && opp.monsters?.[targetSlot]) {
                const targetMon = opp.monsters[targetSlot];
                opp.monsters[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, targetMon, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌊💀 [Michizure] ¡Arrastra a "${targetMon.card_data?.name || 'Monstruo'}" al Cementerio tras la destrucción de tu monstruo!`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 37313786,
        name: "Gamble",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const oppHand = duelState[oppKey]?.hand?.length || 0;
            const myHand = duelState[playerKey]?.hand?.length || 0;
            if (oppHand < 6 || myHand > 1) {
                return { canActivate: false, reason: "El rival debe tener 6 o más cartas en mano y tú 1 o menos." };
            }
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const coin = Math.random() < 0.5 ? 'CARA' : 'CRUZ';
            const winnerKey = coin === 'CARA' ? playerKey : opponentKey;
            const winner = duelState[winnerKey];
            for (let i = 0; i < 5; i++) {
                if (winner.deck.length > 0) winner.hand.push(winner.deck.pop());
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪙🎲 [Gamble] Resultado de la moneda: ¡${coin}! ${winner.username} roba 5 cartas del Deck.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 63689843,
        name: "Attack and Receive",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const copiesInGY = (duelState[playerKey]?.graveyard || []).filter(c => Number(c.card_id || c.id) === 63689843).length;
            const dmg = 700 + (copiesInGY * 300);
            duelState[oppKey].lp = Math.max(0, (duelState[oppKey].lp || 8000) - dmg);
            effectUtils.emitDuelLog(duelState.roomId, `⚡💥 [Attack and Receive] ¡Contraataque de daño! Inflige ${dmg} puntos de daño a ${duelState[oppKey].username}. (LP: ${duelState[oppKey].lp})`, 'damage');
            return { success: true };
        }
    },
    {
        id: 59560625,
        name: "Shift",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            const monsterCount = (duelState[playerKey]?.monsters || []).filter(m => m).length;
            if (monsterCount < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para cambiar el objetivo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔄🔀 [Shift] ¡Cambia el objetivo del efecto del rival a otro monstruo de tu campo!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 58621589,
        name: "Shadow of Eyes",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const setMonIdx = (opp?.monsters || []).findLastIndex(m => m && m.faceDown);
            if (setMonIdx !== -1) {
                const mon = opp.monsters[setMonIdx];
                mon.faceDown = false;
                mon.position = 'ATK';
                effectUtils.emitDuelLog(duelState.roomId, `👁️⭐ [Shadow of Eyes] Fuerza a "${mon.card_data?.name || 'Monstruo'}" a Posición de Ataque boca arriba.`, 'trap');
            }
            return { success: true };
        }
    }
];

function generateCode(card) {
    let extraFields = '';
    if (card.isEquip) extraFields += `    isEquip: true,\n`;
    if (card.isContinuous) extraFields += `    isContinuous: true,\n`;
    if (card.isField) extraFields += `    isField: true,\n`;
    if (card.isQuickPlay) extraFields += `    isQuickPlay: true,\n`;
    if (card.isTrap) extraFields += `    isTrap: true,\n`;
    if (card.isCounter) extraFields += `    isCounter: true,\n`;
    if (card.isAttackTrap) extraFields += `    isAttackTrap: true,\n`;
    if (card.isSpellTrapRemoval) extraFields += `    isSpellTrapRemoval: true,\n`;
    if (card.isMonsterRemoval) extraFields += `    isMonsterRemoval: true,\n`;
    if (card.remainsOnField) extraFields += `    remainsOnField: true,\n`;
    if (card.isImperialOrder) extraFields += `    isImperialOrder: true,\n`;
    if (card.isGravityBind) extraFields += `    isGravityBind: true,\n`;

    const canEquipStr = card.canEquip ? `    ${card.canEquip.toString()},\n\n` : '';
    const getValidTargetsStr = card.getValidTargets ? `    ${card.getValidTargets.toString()},\n\n` : '';
    const onStandbyStr = card.onStandby ? `    ${card.onStandby.toString()},\n\n` : '';

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: PSV
 */
module.exports = {
    id: ${card.id},
    name: "${card.name}",
    type: "${card.type}",
    race: "${card.race}",
${extraFields}
${canEquipStr}${getValidTargetsStr}    ${card.canActivate.toString()},

    ${card.onActivate.toString()},

${onStandbyStr}    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;
}

console.log(`Escribiendo ${cardsBatch1.length} cartas de Magias y Trampas de PSV...`);
cardsBatch1.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [PSV] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 1 de PSV completado exitosamente.');
