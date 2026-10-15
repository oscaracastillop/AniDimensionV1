/**
 * Script de implementación de alta fidelidad para Magias y Trampas de LOD (45 cartas)
 * Expansión: Legacy of Darkness (LOD)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch1 = [
    // -------------------------------------------------------------
    // EQUIP SPELLS (3 cartas)
    // -------------------------------------------------------------
    {
        id: 64801562,
        name: "Heart of Clear Water",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(targetMonster, isOwnMonster) {
            if (!targetMonster) return false;
            const cd = targetMonster.card_data || targetMonster;
            const atk = targetMonster.currentAtk !== undefined ? targetMonster.currentAtk : (cd.atk || 0);
            return atk <= 1300;
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasTarget = (p?.monsters || []).some(m => m && this.canEquip(m, true)) ||
                              (opp?.monsters || []).some(m => m && this.canEquip(m, false));
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos compatibles con 1300 ATK o menos en ningún campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targets = [];
            (p?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, true)) targets.push({ playerKey, slotIndex: idx });
            });
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, false)) targets.push({ playerKey: oppKey, slotIndex: idx });
            });
            return targets;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            targetMon.cannotBeDestroyedByBattle = true;
            targetMon.cannotBeTargetedByEffects = true;
            effectUtils.emitDuelLog(duelState.roomId, `💧🛡️ [Heart of Clear Water] Equipada a "${targetMon.name || targetMon.card_data?.name}". No puede ser destruido en batalla ni por efectos mientras su ATK sea <= 1300.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 37684215,
        name: "Fusion Sword Murasame Blade",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        cannotBeDestroyedBySpells: true,
        canEquip(targetMonster, isOwnMonster) {
            if (!targetMonster) return false;
            const cd = targetMonster.card_data || targetMonster;
            const race = (cd.race || '').toLowerCase();
            return race.includes('warrior') || race.includes('guerrero');
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasWarrior = (p?.monsters || []).some(m => m && this.canEquip(m, true)) ||
                               (opp?.monsters || []).some(m => m && this.canEquip(m, false));
            if (!hasWarrior) return { canActivate: false, reason: "No hay monstruos de Tipo Guerrero boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targets = [];
            (p?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, true)) targets.push({ playerKey, slotIndex: idx });
            });
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, false)) targets.push({ playerKey: oppKey, slotIndex: idx });
            });
            return targets;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + 800;
            effectUtils.emitDuelLog(duelState.roomId, `🗡️⚔️ [Fusion Sword Murasame Blade] Equipada a "${targetMon.name || targetMon.card_data?.name}". Gana +800 ATK (ATK actual: ${targetMon.currentAtk}). Inmune a destrucción por Magias.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 63789924,
        name: "Smoke Grenade of the Thief",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(targetMonster, isOwnMonster) {
            return Boolean(targetMonster);
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasMon = (p?.monsters || []).some(m => m) || (opp?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "No hay monstruos en el campo para equipar." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const targets = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m) targets.push({ playerKey, slotIndex: idx });
            });
            (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
                if (m) targets.push({ playerKey: oppKey, slotIndex: idx });
            });
            return targets;
        },
        async onDestroyedWhileEquipped(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.hand && opp.hand.length > 0) {
                const rIdx = Math.floor(Math.random() * opp.hand.length);
                const discarded = opp.hand.splice(rIdx, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `💨💣 [Smoke Grenade of the Thief] Destruida mientras estaba equipada: Mira la mano del rival y descarta "${discarded.name || discarded.card_data?.name}".`, 'spell');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            effectUtils.emitDuelLog(duelState.roomId, `💨 [Smoke Grenade of the Thief] Equipada a "${targetMon.name || targetMon.card_data?.name}". Si esta carta es destruida, descartará 1 carta de la mano rival.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // FIELD SPELLS (2 cartas)
    // -------------------------------------------------------------
    {
        id: 69296555,
        name: "Array of Revealing Light",
        type: "Field Spell",
        race: "Spell",
        isField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fieldSpell = { id: 69296555, name: "Array of Revealing Light", controller: playerKey };
            effectUtils.emitDuelLog(duelState.roomId, `☀️✨ [Array of Revealing Light] Campo activo: Los monstruos del Tipo declarado no pueden atacar en el turno en que son Invocados.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 295517,
        name: "A Legendary Ocean",
        type: "Field Spell",
        race: "Spell",
        isField: true,
        treatAsUmi: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fieldSpell = { id: 295517, name: "A Legendary Ocean", controller: playerKey, treatAsUmi: true };
            // Modificadores globales: AGUA +200 ATK/DEF y reduce nivel en 1 en mano y campo
            ['player1', 'player2'].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach(m => {
                    if (m && (m.attribute === 'WATER' || m.card_data?.attribute === 'WATER')) {
                        m.currentAtk = (m.currentAtk !== undefined ? m.currentAtk : (m.card_data?.atk || 0)) + 200;
                        m.currentDef = (m.currentDef !== undefined ? m.currentDef : (m.card_data?.def || 0)) + 200;
                    }
                });
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌊🏛️ [A Legendary Ocean] ¡Campo activo! Se trata como "Umi". Todos los monstruos de AGUA ganan +200 ATK/DEF y sus Niveles se reducen en 1.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // QUICK-PLAY SPELLS (2 cartas)
    // -------------------------------------------------------------
    {
        id: 53046408,
        name: "Emergency Provisions",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const otherCards = (p?.spells || []).filter(s => s && Number(s.card_id || s.card_data?.id) !== 53046408);
            if (otherCards.length === 0) return { canActivate: false, reason: "Se requiere enviar otras Magias/Trampas al Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let sentCount = 0;
            (p.spells || []).forEach((s, idx) => {
                if (s && Number(s.card_id || s.card_data?.id) !== 53046408) {
                    effectUtils.sendCardToGraveyard(duelState, s, playerKey);
                    p.spells[idx] = null;
                    sentCount++;
                }
            });
            const lpGain = sentCount * 1000;
            p.lifePoints = (p.lifePoints || 0) + lpGain;
            effectUtils.emitDuelLog(duelState.roomId, `🥫✨ [Emergency Provisions] Envía ${sentCount} cartas Mágicas/Trampas al Cementerio y recupera ${lpGain} LP (LP: ${p.lifePoints}).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 27770341,
        name: "Super Rejuvenation",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            p.activeSuperRejuvenation = true;
            effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Super Rejuvenation] Activada: En la End Phase robarás 1 carta por cada monstruo Dragón descartado o tributado este turno.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // NORMAL SPELLS (12 cartas)
    // -------------------------------------------------------------
    {
        id: 40703393,
        name: "The Puppet Magic of Dark Ruler",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiendInGY = (p?.graveyard || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'fiend');
            const hasFieldMonsters = (p?.monsters || []).some(m => m);
            if (!hasFiendInGY || !hasFieldMonsters) return { canActivate: false, reason: "Se requiere tributar monstruos en campo e invocar un Demonio del Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const gyFiendIdx = (p.graveyard || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'fiend');
            if (gyFiendIdx !== -1) {
                const targetFiend = p.graveyard.splice(gyFiendIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    targetFiend.position = 'face-up-attack';
                    p.monsters[emptySlot] = targetFiend;
                    effectUtils.emitDuelLog(duelState.roomId, `🎭👑 [The Puppet Magic of Dark Ruler] Invoca de Modo Especial a "${targetFiend.name || targetFiend.card_data?.name}" desde el Cementerio.`, 'spell');
                }
            }
            return { success: true };
        }
    },
    {
        id: 3682106,
        name: "Double Snare",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const hasTarget = (opp?.spells || []).some(s => s) || (opp?.monsters || []).some(m => m && (m.isJinzo || m.isTrapNegator));
            if (!hasTarget) return { canActivate: false, reason: "No hay cartas negadoras de trampas en el campo rival." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const jinzoIdx = (opp.monsters || []).findIndex(m => m && (m.isJinzo || m.isTrapNegator || Number(m.card_id || m.card_data?.id) === 77585513));
            if (jinzoIdx !== -1) {
                const jinzo = opp.monsters[jinzoIdx];
                effectUtils.sendCardToGraveyard(duelState, jinzo, oppKey);
                opp.monsters[jinzoIdx] = null;
                effectUtils.emitDuelLog(duelState.roomId, `🪤💥 [Double Snare] Destruye a "${jinzo.name || jinzo.card_data?.name}" en el campo rival.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 32807846,
        name: "Reinforcement of the Army",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarriorInDeck = (p?.deck || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (!hasWarriorInDeck) return { canActivate: false, reason: "No hay monstruos Guerrero de Nivel 4 o menor en tu Deck." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const wIdx = (p.deck || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (wIdx !== -1) {
                const warrior = p.deck.splice(wIdx, 1)[0];
                p.hand = p.hand || [];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [Reinforcement of the Army] Añade "${warrior.name || warrior.card_data?.name}" (Guerrero Nv.${warrior.level || warrior.card_data?.level}) del Deck a la mano.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 95281259,
        name: "The Warrior Returning Alive",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarriorInGY = (p?.graveyard || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior');
            if (!hasWarriorInGY) return { canActivate: false, reason: "No hay monstruos Guerrero en tu Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const wIdx = (p.graveyard || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior');
            if (wIdx !== -1) {
                const warrior = p.graveyard.splice(wIdx, 1)[0];
                p.hand = p.hand || [];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️⚔️ [The Warrior Returning Alive] Recupera a "${warrior.name || warrior.card_data?.name}" del Cementerio a la mano.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 28596933,
        name: "A Wingbeat of Giant Dragon",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasL5Dragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon' && (m.level || m.card_data?.level || 0) >= 5);
            if (!hasL5Dragon) return { canActivate: false, reason: "Requiere 1 monstruo Dragón de Nivel 5 o mayor boca arriba en tu campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Devuelve el Dragón Nv 5+ a la mano
            const dIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon' && (m.level || m.card_data?.level || 0) >= 5);
            if (dIdx !== -1) {
                const dragon = p.monsters[dIdx];
                p.monsters[dIdx] = null;
                p.hand.push(dragon);
            }

            // Destruye todas las Magias y Trampas en el campo
            let destroyed = 0;
            [p, opp].forEach(player => {
                (player.spells || []).forEach((s, idx) => {
                    if (s) {
                        effectUtils.sendCardToGraveyard(duelState, s, player === p ? playerKey : oppKey);
                        player.spells[idx] = null;
                        destroyed++;
                    }
                });
            });

            effectUtils.emitDuelLog(duelState.roomId, `🌪️🐉 [A Wingbeat of Giant Dragon] Devuelve un Dragón Nv.5+ a la mano y destruye ${destroyed} cartas Mágicas/Trampas en el campo.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 55991637,
        name: "Dragon's Gunfire",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragon) return { canActivate: false, reason: "Requiere al menos 1 monstruo Dragón boca arriba en tu campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            // Opción estándar: 800 de daño al rival
            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🐉 [Dragon's Gunfire] ¡Fuego de Dragón! Inflige 800 de daño directo a ${opp.username} (LP: ${opp.lifePoints}).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 81385346,
        name: "Stamping Destruction",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            const hasTarget = (p?.spells || []).some(s => s) || (opp?.spells || []).some(s => s);
            if (!hasDragon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo Dragón boca arriba." };
            if (!hasTarget) return { canActivate: false, reason: "No hay cartas Mágicas o Trampas en el campo para destruir." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const targetCard = opp.spells[sIdx];
                effectUtils.sendCardToGraveyard(duelState, targetCard, oppKey);
                opp.spells[sIdx] = null;
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `💥🐉 [Stamping Destruction] Destruye "${targetCard.name || targetCard.card_data?.name}" e inflige 500 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 37406863,
        name: "Fengsheng Mirror",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (!opp?.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en su mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            let discarded = 0;
            for (let i = opp.hand.length - 1; i >= 0; i--) {
                const c = opp.hand[i];
                if ((c.type || '').includes('Spirit') || (c.card_data?.type || '').includes('Spirit')) {
                    opp.hand.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, oppKey);
                    discarded++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪞💨 [Fengsheng Mirror] Revela la mano del rival y descarta ${discarded} monstruos Spirit al Cementerio.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 31036355,
        name: "Creature Swap",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasMyMon = (p?.monsters || []).some(m => m);
            const hasOppMon = (opp?.monsters || []).some(m => m);
            if (!hasMyMon || !hasOppMon) return { canActivate: false, reason: "Ambos jugadores deben controlar al menos 1 monstruo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const pSlot = (p.monsters || []).findIndex(m => m);
            const oppSlot = (opp.monsters || []).findIndex(m => m);

            if (pSlot !== -1 && oppSlot !== -1) {
                const pMon = p.monsters[pSlot];
                const oppMon = opp.monsters[oppSlot];

                p.monsters[pSlot] = oppMon;
                opp.monsters[oppSlot] = pMon;

                effectUtils.emitDuelLog(duelState.roomId, `🔄🔄 [Creature Swap] ¡Intercambio de criaturas! ${p.username} cede a "${pMon.name || pMon.card_data?.name}" y toma control de "${oppMon.name || oppMon.card_data?.name}". Ninguno puede cambiar su posición este turno.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 99351431,
        name: "The Secret of the Bandit",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para seleccionar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const mon = (p.monsters || []).find(m => m);
            if (mon) {
                mon.discardOnBattleDamage = true;
                effectUtils.emitDuelLog(duelState.roomId, `🗡️💰 [The Secret of the Bandit] Cada vez que "${mon.name || mon.card_data?.name}" inflija daño de batalla este turno, el rival descartará 1 carta al azar.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 25345186,
        name: "After the Struggle",
        type: "Normal Spell",
        race: "Spell",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.afterTheStruggleActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️💥 [After the Struggle] Todos los monstruos que participen en batalla este turno serán destruidos al final de la Battle Phase.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 61844784,
        name: "Magic Reflector",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasCard = (duelState[playerKey]?.spells || []).some(s => s) ||
                            (duelState[oppKey]?.spells || []).some(s => s);
            if (!hasCard) return { canActivate: false, reason: "No hay cartas Mágicas o Trampas en el campo para colocar un contador." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const s = (p.spells || []).find(card => card && Number(card.card_id || card.card_data?.id) !== 61844784);
            if (s) {
                s.hasReflectorCounter = true;
                effectUtils.emitDuelLog(duelState.roomId, `🛡️✨ [Magic Reflector] Coloca un Contador Reflector en "${s.name || s.card_data?.name}". La próxima vez que vaya a ser destruida, el contador se remueve en su lugar.`, 'spell');
            }
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // CONTINUOUS SPELLS (5 cartas)
    // -------------------------------------------------------------
    {
        id: 403847,
        name: "The A. Forces",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        calculateStatModifiers(monster, duelState, playerKey) {
            if (!monster) return { atkMod: 0, defMod: 0 };
            const cd = monster.card_data || monster;
            const race = (cd.race || '').toLowerCase();
            if (race.includes('warrior') || race.includes('guerrero')) {
                const count = (duelState[playerKey]?.monsters || []).filter(m => {
                    if (!m) return false;
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    return r.includes('warrior') || r.includes('spellcaster');
                }).length;
                return { atkMod: count * 200, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⚔️🎖️ [The A. Forces] Magia continua activa: Todos los Guerreros ganan +200 ATK por cada Guerrero y Lanzador de Conjuros que controles.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 94425169,
        name: "Spring of Rebirth",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onMonsterReturnedToHand(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 500;
            effectUtils.emitDuelLog(duelState.roomId, `⛲✨ [Spring of Rebirth] Un monstruo regresó del campo a la mano: Aumenta tus LP en 500 (LP: ${p.lifePoints}).`, 'spell');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⛲ [Spring of Rebirth] Magia continua activa: Recuperas 500 LP cada vez que un monstruo del campo regrese a la mano.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 99173029,
        name: "Spiritual Energy Settle Machine",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        preventsSpiritReturn: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🌀⚙️ [Spiritual Energy Settle Machine] Magia continua activa: Los monstruos Spirit no regresan a la mano durante la End Phase. Descarta 1 carta en tu End Phase como mantenimiento.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 36562627,
        name: "Second Coin Toss",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🪙✨ [Second Coin Toss] Magia continua activa: Puedes repetir 1 lanzamiento de moneda una vez por turno.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 62966332,
        name: "Convulsion of Nature",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.reverseDecks = true;
            effectUtils.emitDuelLog(duelState.roomId, `🔄📚 [Convulsion of Nature] ¡Magia continua activa! Ambos jugadores voltean sus Decks boca arriba por el resto del duelo.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // CONTINUOUS TRAPS (9 cartas)
    // -------------------------------------------------------------
    {
        id: 77910045,
        name: "Fatal Abacus",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onMonsterSentToGraveyard(context) {
            const { duelState, ownerKey, effectUtils } = context;
            const owner = duelState[ownerKey];
            if (owner) {
                owner.lifePoints = Math.max(0, (owner.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🧮💀 [Fatal Abacus] ¡Un monstruo fue enviado al Cementerio! ${owner.username} recibe 500 de daño (LP: ${owner.lifePoints}).`, 'trap');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧮 [Fatal Abacus] Trampa continua activa: Cada vez que un monstruo del campo sea enviado al Cementerio, su dueño recibe 500 de daño.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 14318794,
        name: "Life Absorbing Machine",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.lpPaidLastTurn) {
                const recovered = Math.floor(p.lpPaidLastTurn / 2);
                p.lifePoints = (p.lifePoints || 0) + recovered;
                p.lpPaidLastTurn = 0;
                effectUtils.emitDuelLog(duelState.roomId, `🔋✨ [Life Absorbing Machine] Recupera la mitad de los LP pagados el turno anterior (+${recovered} LP, LP: ${p.lifePoints}).`, 'trap');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔋 [Life Absorbing Machine] Trampa continua activa: Recuperas la mitad de los LP pagados como costo en tu Standby Phase.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 76297408,
        name: "Soul Demolition",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 500) return { canActivate: false, reason: "Se requieren más de 500 LP para activar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            p.lifePoints = Math.max(0, (p.lifePoints || 0) - 500);

            let banished = 0;
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                const c = opp.graveyard.pop();
                opp.banished.push(c);
                banished++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `👻💥 [Soul Demolition] Paga 500 LP y destierra ${banished} monstruo del Cementerio rival (LP: ${p.lifePoints}).`, 'trap');
            return { success: true };
        }
    },
    {
        id: 92408984,
        name: "The Dragon's Bead",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onNegateTrap(context) {
            const { duelState, playerKey, trapCard, effectUtils } = context;
            const p = duelState[playerKey];
            // Descarta 1 carta de la mano para negar una Trampa que designe a un Dragón
            if (p?.hand && p.hand.length > 0) {
                const discarded = p.hand.shift();
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                effectUtils.emitDuelLog(duelState.roomId, `🔮🐉 [The Dragon's Bead] Descarta "${discarded.name || discarded.card_data?.name}" y niega la Trampa "${trapCard?.name || 'Trampa'}".`, 'trap');
                return { success: true, negated: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮🐉 [The Dragon's Bead] Trampa continua activa: Descarta 1 carta para negar Trampas que designen como objetivo a tus Dragones.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 54178050,
        name: "Dragon's Rage",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        hasDragonPiercing: true,
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🐉💥 [Dragon's Rage] Trampa continua activa: Todos tus monstruos de Tipo Dragón infligen daño de penetración contra monstruos en Posición de Defensa.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 93016201,
        name: "Royal Oppression",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onNegateSpecialSummon(context) {
            const { duelState, playerKey, summonedMonster, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 800) {
                p.lifePoints -= 800;
                effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Royal Oppression] Paga 800 LP (LP: ${p.lifePoints}) y niega la Invocación Especial de "${summonedMonster?.name || 'Monstruo'}".`, 'trap');
                return { success: true, negated: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👑 [Royal Oppression] Trampa continua activa: Cualquier jugador puede pagar 800 LP para negar una Invocación Especial y destruirla.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 40633297,
        name: "Bad Reaction to Simochi",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        convertsHealToDamage: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.simochiActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `☠️💊 [Bad Reaction to Simochi] ¡Trampa continua activa! Todos los efectos que aumenten los LP del rival ahora le infligirán esa misma cantidad como daño directo.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 56995655,
        name: "Ominous Fortunetelling",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.hand && opp.hand.length > 0) {
                const rCard = opp.hand[Math.floor(Math.random() * opp.hand.length)];
                // Si la carta seleccionada al azar es un monstruo, inflige 500 de daño
                if ((rCard.type || '').toLowerCase().includes('monster') || rCard.atk !== undefined) {
                    opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                    effectUtils.emitDuelLog(duelState.roomId, `🔮 [Ominous Fortunetelling] Adivinación acertada: Selecciona "${rCard.name || rCard.card_data?.name}" (Monstruo) e inflige 500 daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'trap');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮 [Ominous Fortunetelling] Trampa continua activa: En tu Standby Phase adivina 1 carta al azar de la mano rival; si aciertas el tipo, inflige 500 de daño.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 92394653,
        name: "Spirit's Invitation",
        type: "Continuous Trap",
        race: "Trap",
        isContinuous: true,
        isTrap: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 500) {
                p.lifePoints -= 500;
                effectUtils.emitDuelLog(duelState.roomId, `👻🕯️ [Spirit's Invitation] Paga 500 LP de mantenimiento obligatorio (LP: ${p.lifePoints}).`, 'trap');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻 [Spirit's Invitation] Trampa continua activa: Cada vez que un monstruo Spirit regrese a tu mano, puedes regresar 1 monstruo rival a la mano.`, 'trap');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // NORMAL TRAPS (12 cartas)
    // -------------------------------------------------------------
    {
        id: 41925941,
        name: "Bark of Dark Ruler",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiend = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (!hasFiend) return { canActivate: false, reason: "Requiere un monstruo Demonio en batalla." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetOppMon = (opp.monsters || []).find(m => m);
            if (targetOppMon) {
                targetOppMon.currentAtk = Math.max(0, (targetOppMon.currentAtk !== undefined ? targetOppMon.currentAtk : (targetOppMon.card_data?.atk || 0)) - 1000);
                effectUtils.emitDuelLog(duelState.roomId, `🗣️💥 [Bark of Dark Ruler] Paga LP para reducir el ATK del monstruo rival en 1000 (ATK restante: ${targetOppMon.currentAtk}).`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 31785398,
        name: "Ready for Intercepting",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasTarget = (duelState[playerKey]?.monsters || []).some(m => m && ['warrior', 'spellcaster'].includes((m.race || m.card_data?.race || '').toLowerCase())) ||
                              (duelState[oppKey]?.monsters || []).some(m => m && ['warrior', 'spellcaster'].includes((m.race || m.card_data?.race || '').toLowerCase()));
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos Guerrero o Lanzador de Conjuros en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let flipped = false;
            [duelState[oppKey], duelState[playerKey]].forEach(player => {
                if (flipped) return;
                const m = (player?.monsters || []).find(mon => mon && ['warrior', 'spellcaster'].includes((mon.race || mon.card_data?.race || '').toLowerCase()));
                if (m) {
                    m.position = 'face-down-defense';
                    m.faceDown = true;
                    flipped = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🛡️🔄 [Ready for Intercepting] Cambia a "${m.name || m.card_data?.name}" a Posición de Defensa boca abajo.`, 'trap');
                }
            });
            return { success: true };
        }
    },
    {
        id: 68170903,
        name: "A Feint Plan",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.feintPlanActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🎭 [A Feint Plan] Durante este turno, el rival no puede atacar a monstruos boca abajo.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 80163754,
        name: "Burst Breath",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragon) return { canActivate: false, reason: "Debes tributar 1 monstruo Dragón." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const dIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            let tAtk = 0;
            if (dIdx !== -1) {
                const dragon = p.monsters[dIdx];
                tAtk = dragon.currentAtk !== undefined ? dragon.currentAtk : (dragon.card_data?.atk || 0);
                effectUtils.sendCardToGraveyard(duelState, dragon, playerKey);
                p.monsters[dIdx] = null;
            }

            let destroyed = 0;
            (opp.monsters || []).forEach((m, idx) => {
                if (m) {
                    const def = m.currentDef !== undefined ? m.currentDef : (m.card_data?.def || 0);
                    if (def <= tAtk) {
                        effectUtils.sendCardToGraveyard(duelState, m, oppKey);
                        opp.monsters[idx] = null;
                        destroyed++;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Burst Breath] Tributa un Dragón (${tAtk} ATK) y destruye ${destroyed} monstruos rivales con DEF <= ${tAtk}.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 98239899,
        name: "Blast with Chain",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para equipar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const targetMon = (p.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + 500;
                targetMon.equippedBlastWithChain = true;
                effectUtils.emitDuelLog(duelState.roomId, `⛓️💣 [Blast with Chain] Equipada a "${targetMon.name || targetMon.card_data?.name}". Gana +500 ATK. Si esta carta es destruida por efecto, destruye 1 carta en el campo.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 24623598,
        name: "Disappear",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (!opp?.graveyard || opp.graveyard.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en su Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                const removed = opp.graveyard.pop();
                opp.banished.push(removed);
                effectUtils.emitDuelLog(duelState.roomId, `💨✨ [Disappear] Destierra "${removed.name || removed.card_data?.name}" del Cementerio de ${opp.username}.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 61622107,
        name: "Bubble Crash",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const pCount = (duelState.player1?.monsters || []).filter(m => m).length + (duelState.player1?.spells || []).filter(s => s).length + (duelState.player1?.hand || []).length;
            const oppCount = (duelState.player2?.monsters || []).filter(m => m).length + (duelState.player2?.spells || []).filter(s => s).length + (duelState.player2?.hand || []).length;
            if (pCount <= 5 && oppCount <= 5) return { canActivate: false, reason: "Ningún jugador tiene más de 5 cartas entre mano y campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🫧💥 [Bubble Crash] ¡Estallido de burbujas! Ambos jugadores reducen sus cartas en mano y campo hasta tener un máximo de 3 cada uno.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 29401950,
        name: "Bottomless Trap Hole",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isSummonTrap: true,
        canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },
        async onSummonResponse(context) {
            const { duelState, opponentKey, summonedMonster, slotIndex, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (summonedMonster) {
                const atk = summonedMonster.currentAtk !== undefined ? summonedMonster.currentAtk : (summonedMonster.card_data?.atk || 0);
                if (atk >= 1500) {
                    opp.monsters[slotIndex] = null;
                    opp.banished = opp.banished || [];
                    opp.banished.push(summonedMonster);
                    effectUtils.emitDuelLog(duelState.roomId, `🕳️💥 [Bottomless Trap Hole] ¡Cae en el Agujero Trampa Sin Fondo! Destruye y destierra a "${summonedMonster.name || summonedMonster.card_data?.name}" (ATK: ${atk} >= 1500).`, 'trap');
                    return { success: true, destroyed: true, banished: true };
                }
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m && (m.currentAtk || m.card_data?.atk || 0) >= 1500);
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                opp.banished = opp.banished || [];
                opp.banished.push(targetMon);
                effectUtils.emitDuelLog(duelState.roomId, `🕳️💥 [Bottomless Trap Hole] Destruye y destierra a "${targetMon.name || targetMon.card_data?.name}".`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 29389368,
        name: "Nutrient Z",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onBattleDamageCalculated(context) {
            const { duelState, playerKey, battleDamage, effectUtils } = context;
            const p = duelState[playerKey];
            if (battleDamage >= 2000) {
                p.lifePoints = (p.lifePoints || 0) + 4000;
                effectUtils.emitDuelLog(duelState.roomId, `🧪✨ [Nutrient Z] ¡Iba a recibir ${battleDamage} de daño de batalla! Aumenta sus LP en 4000 antes de recibir el daño (LP: ${p.lifePoints}).`, 'trap');
                return { success: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 55773067,
        name: "Drop Off",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onOpponentDraw(context) {
            const { duelState, opponentKey, drawnCard, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp?.hand && opp.hand.length > 0) {
                const card = drawnCard || opp.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, card, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `📭💥 [Drop Off] ¡El rival roba en su Draw Phase! Descarta inmediatamente la carta robada ("${card.name || card.card_data?.name}") al Cementerio.`, 'trap');
                return { success: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 81172176,
        name: "Fiend Comedian",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const coinFlip = Math.random() >= 0.5 ? 'CARA' : 'CRUZ';
            if (coinFlip === 'CARA') {
                // CARA: Destierra todas las cartas del Cementerio rival
                const count = (opp.graveyard || []).length;
                opp.banished = opp.banished || [];
                while (opp.graveyard && opp.graveyard.length > 0) {
                    opp.banished.push(opp.graveyard.pop());
                }
                effectUtils.emitDuelLog(duelState.roomId, `🎭🪙 [Fiend Comedian] Resultado: CARA. ¡Destierra las ${count} cartas del Cementerio de ${opp.username}!`, 'trap');
            } else {
                // CRUZ: Envía cartas del tope de tu Deck al Cementerio igual a la cantidad de cartas en el Cementerio rival
                const oppGyCount = (opp.graveyard || []).length;
                let sent = 0;
                for (let i = 0; i < oppGyCount && p.deck && p.deck.length > 0; i++) {
                    const c = p.deck.shift();
                    effectUtils.sendCardToGraveyard(duelState, c, playerKey);
                    sent++;
                }
                effectUtils.emitDuelLog(duelState.roomId, `🎭🪙 [Fiend Comedian] Resultado: CRUZ. Envía ${sent} cartas del tope de tu Deck al Cementerio.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 28566710,
        name: "Last Turn",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) return { canActivate: false, reason: "Solo se puede activar cuando tus LP son 1000 o menos." };
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar 1 monstruo en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Selecciona 1 monstruo del controlador; envía todas las demás cartas al Cementerio
            const selectedMonIdx = (p.monsters || []).findIndex(m => m);
            const selectedMon = p.monsters[selectedMonIdx];

            [p, opp].forEach(player => {
                (player.monsters || []).forEach((m, idx) => {
                    if (m && (player !== p || idx !== selectedMonIdx)) {
                        effectUtils.sendCardToGraveyard(duelState, m, player === p ? playerKey : oppKey);
                        player.monsters[idx] = null;
                    }
                });
                (player.spells || []).forEach((s, idx) => {
                    if (s) {
                        effectUtils.sendCardToGraveyard(duelState, s, player === p ? playerKey : oppKey);
                        player.spells[idx] = null;
                    }
                });
                (player.hand || []).forEach(c => {
                    effectUtils.sendCardToGraveyard(duelState, c, player === p ? playerKey : oppKey);
                });
                player.hand = [];
            });

            // El rival Invoca de Modo Especial 1 monstruo de su Deck
            const oppDeckMonIdx = (opp.deck || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') || c.atk !== undefined);
            if (oppDeckMonIdx !== -1) {
                const oppMon = opp.deck.splice(oppDeckMonIdx, 1)[0];
                oppMon.position = 'face-up-attack';
                opp.monsters[0] = oppMon;
            }

            duelState.lastTurnDuel = true;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️👑 [Last Turn] ¡DUELO A MUERTE! Todas las demás cartas enviadas al Cementerio. Los dos monstruos combatirán en la Battle Phase para decidir la victoria del duelo.`, 'trap');
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
    if (card.isAttackTrap) extraFields += `    isAttackTrap: true,\n`;
    if (card.isSummonTrap) extraFields += `    isSummonTrap: true,\n`;
    if (card.remainsOnField) extraFields += `    remainsOnField: true,\n`;
    if (card.cannotBeDestroyedBySpells) extraFields += `    cannotBeDestroyedBySpells: true,\n`;
    if (card.treatAsUmi) extraFields += `    treatAsUmi: true,\n`;
    if (card.preventsSpiritReturn) extraFields += `    preventsSpiritReturn: true,\n`;
    if (card.hasDragonPiercing) extraFields += `    hasDragonPiercing: true,\n`;
    if (card.convertsHealToDamage) extraFields += `    convertsHealToDamage: true,\n`;

    const methods = [];
    if (card.canEquip) methods.push(`    ${card.canEquip.toString()}`);
    if (card.getValidTargets) methods.push(`    ${card.getValidTargets.toString()}`);
    if (card.canActivate) methods.push(`    ${card.canActivate.toString()}`);
    if (card.onActivate) methods.push(`    ${card.onActivate.toString()}`);
    if (card.onDestroyedWhileEquipped) methods.push(`    ${card.onDestroyedWhileEquipped.toString()}`);
    if (card.onMonsterReturnedToHand) methods.push(`    ${card.onMonsterReturnedToHand.toString()}`);
    if (card.onMonsterSentToGraveyard) methods.push(`    ${card.onMonsterSentToGraveyard.toString()}`);
    if (card.onStandbyPhase) methods.push(`    ${card.onStandbyPhase.toString()}`);
    if (card.onNegateTrap) methods.push(`    ${card.onNegateTrap.toString()}`);
    if (card.onNegateSpecialSummon) methods.push(`    ${card.onNegateSpecialSummon.toString()}`);
    if (card.onSummonResponse) methods.push(`    ${card.onSummonResponse.toString()}`);
    if (card.onBattleDamageCalculated) methods.push(`    ${card.onBattleDamageCalculated.toString()}`);
    if (card.onOpponentDraw) methods.push(`    ${card.onOpponentDraw.toString()}`);
    if (card.calculateStatModifiers) methods.push(`    ${card.calculateStatModifiers.toString()}`);

    const methodsStr = methods.join(',\n\n');

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: LOD
 */
module.exports = {
    id: ${card.id},
    name: ${JSON.stringify(card.name)},
    type: "${card.type}",
    race: "${card.race}",
${extraFields}
${methodsStr},

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;
}

console.log(`Escribiendo ${cardsBatch1.length} cartas de Magias y Trampas de LOD...`);
cardsBatch1.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [LOD] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 1 de LOD completado exitosamente.');
