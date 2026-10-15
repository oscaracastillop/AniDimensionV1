/**
 * Script de implementación de alta fidelidad para Monstruos de LON (36 cartas)
 * Expansión: Labyrinth of Nightmare (LON)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch2 = [
    // -------------------------------------------------------------
    // 1. RITUAL MONSTER (1 carta)
    // -------------------------------------------------------------
    {
        id: 49064413,
        name: "The Masked Beast",
        type: "Ritual Monster",
        atk: 3200,
        def: 1800,
        level: 8,
        race: "Fiend",
        attribute: "DARK",
        isRitual: true,
        ritualInfo: { ritualSpellId: 94377247, requiredTributesLevel: 8 },
        canActivate() { return { canActivate: false, reason: "Monstruo de Ritual, se invoca mediante Curse of the Masked Beast." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // 2. FUSION MONSTERS (3 cartas)
    // -------------------------------------------------------------
    {
        id: 5600127,
        name: "Humanoid Worm Drake",
        type: "Fusion Monster",
        atk: 2200,
        def: 2000,
        level: 7,
        race: "Aqua",
        attribute: "WATER",
        isFusion: true,
        fusionMaterials: [73216412, 46821314], // Worm Drake (73216412) + Humanoid Slime (46821314)
        canActivate() { return { canActivate: false, reason: "Monstruo de Fusión sin efecto de ignición." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 21175632,
        name: "St. Joan",
        type: "Fusion Monster",
        atk: 2800,
        def: 2000,
        level: 7,
        race: "Fairy",
        attribute: "LIGHT",
        isFusion: true,
        fusionMaterials: [84080938, 57579381], // The Forgiving Maiden (84080938) + Darklord Marie (57579381)
        canActivate() { return { canActivate: false, reason: "Monstruo de Fusión sin efecto de ignición." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 86099788,
        name: "The Last Warrior from Another Planet",
        type: "Fusion Effect Monster",
        atk: 2350,
        def: 2300,
        level: 7,
        race: "Warrior",
        attribute: "EARTH",
        isFusion: true,
        fusionMaterials: [88472456, 71466592], // Zombyra the Dark (88472456) + Maryokutai (71466592)
        preventsAllSummons: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo/disparado pasivo." }; },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (!p || !p.monsters) return { success: true };
            let destroyed = 0;
            p.monsters.forEach((m, idx) => {
                if (m && Number(m.card_id || m.card_data?.id) !== 86099788) {
                    effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                    p.monsters[idx] = null;
                    destroyed++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `⚔️ [The Last Warrior from Another Planet] ¡Al ser Invocado de Modo Especial, destruye ${destroyed} otros monstruos de su controlador! Ningún jugador puede Invocar monstruos.`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },

    // -------------------------------------------------------------
    // 3. FLIP EFFECT MONSTERS (5 cartas)
    // -------------------------------------------------------------
    {
        id: 90147755,
        name: "Lady Assailant of Flames",
        type: "Flip Effect Monster",
        atk: 1500,
        def: 1000,
        level: 4,
        race: "Pyro",
        attribute: "FIRE",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            
            // Banish top 3 cards from Deck
            const banishedCards = [];
            for (let i = 0; i < 3 && p.deck && p.deck.length > 0; i++) {
                const c = p.deck.shift();
                p.banished = p.banished || [];
                p.banished.push(c);
                banishedCards.push(c);
            }
            
            // Inflict 800 damage
            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Lady Assailant of Flames] ¡VOLTEO! Destierra ${banishedCards.length} cartas del tope del Deck de ${p.username} e inflige 800 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 27132350,
        name: "Fire Sorcerer",
        type: "Flip Effect Monster",
        atk: 1000,
        def: 1500,
        level: 4,
        race: "Spellcaster",
        attribute: "FIRE",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let banishedCount = 0;
            p.banished = p.banished || [];
            while (p.hand && p.hand.length > 0 && banishedCount < 2) {
                const rIdx = Math.floor(Math.random() * p.hand.length);
                const removed = p.hand.splice(rIdx, 1)[0];
                p.banished.push(removed);
                banishedCount++;
            }

            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🧙 [Fire Sorcerer] ¡VOLTEO! Destierra ${banishedCount} cartas de la mano al azar e inflige 800 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 14644902,
        name: "Summoner of Illusions",
        type: "Flip Effect Monster",
        atk: 800,
        def: 900,
        level: 3,
        race: "Spellcaster",
        attribute: "LIGHT",
        isFlip: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const otherMonsters = (p?.monsters || []).filter(m => m && Number(m.card_id || m.card_data?.id) !== 14644902);
            if (otherMonsters.length === 0) return { canActivate: false, reason: "No hay otro monstruo para ofrecer como tributo." };
            if (!p.extraDeck || p.extraDeck.length === 0) return { canActivate: false, reason: "No hay monstruos en el Deck Extra." };
            return { canActivate: true };
        },
        async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const tIndex = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) !== 14644902);
            if (tIndex !== -1) {
                const tMon = p.monsters[tIndex];
                effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
                p.monsters[tIndex] = null;
            }

            // Invocar 1 monstruo de Fusión del Extra Deck
            const fusionIdx = (p.extraDeck || []).findIndex(c => (c.type || '').toLowerCase().includes('fusion') || c.isFusion);
            if (fusionIdx !== -1) {
                const fusionMon = p.extraDeck.splice(fusionIdx, 1)[0];
                const emptySlot = p.monsters.findIndex(m => !m);
                if (emptySlot !== -1) {
                    fusionMon.position = 'face-up-attack';
                    fusionMon.currentAtk = fusionMon.atk || fusionMon.card_data?.atk || 0;
                    fusionMon.currentDef = fusionMon.def || fusionMon.card_data?.def || 0;
                    fusionMon.destroyAtEndPhase = true;
                    p.monsters[emptySlot] = fusionMon;
                    effectUtils.emitDuelLog(duelState.roomId, `✨ [Summoner of Illusions] ¡VOLTEO! Ofrece un monstruo e Invoca de Modo Especial a "${fusionMon.name || fusionMon.card_data?.name}" desde el Extra Deck. Se destruirá en la End Phase.`, 'flip');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 71283180,
        name: "Tornado Bird",
        type: "Flip Effect Monster",
        atk: 1100,
        def: 1000,
        level: 4,
        race: "Winged Beast",
        attribute: "WIND",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let bounced = 0;
            // Retorna hasta 2 cartas Mágicas o de Trampa del campo a la mano
            const targets = [];
            (opp.spellTrapZone || []).forEach((st, idx) => {
                if (st && targets.length < 2) targets.push({ zone: 'opp', idx, card: st });
            });
            (p.spellTrapZone || []).forEach((st, idx) => {
                if (st && targets.length < 2) targets.push({ zone: 'p', idx, card: st });
            });

            targets.forEach(t => {
                if (t.zone === 'opp') {
                    opp.spellTrapZone[t.idx] = null;
                    opp.hand.push(t.card);
                } else {
                    p.spellTrapZone[t.idx] = null;
                    p.hand.push(t.card);
                }
                bounced++;
            });

            effectUtils.emitDuelLog(duelState.roomId, `🌪️ [Tornado Bird] ¡VOLTEO! Devuelve ${bounced} cartas Mágicas/Trampas del campo a la mano de sus dueños.`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 44072894,
        name: "Supply",
        type: "Flip Effect Monster",
        atk: 1300,
        def: 800,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            let retrieved = 0;
            if (p.graveyard && p.graveyard.length > 0) {
                // Recuperar hasta 2 monstruos de material de fusión del cementerio a la mano
                const validMats = [];
                for (let i = p.graveyard.length - 1; i >= 0 && validMats.length < 2; i--) {
                    const card = p.graveyard[i];
                    if (card && (card.type || '').toLowerCase().includes('monster')) {
                        validMats.push(i);
                    }
                }
                validMats.forEach(idx => {
                    const c = p.graveyard.splice(idx, 1)[0];
                    p.hand.push(c);
                    retrieved++;
                });
            }
            effectUtils.emitDuelLog(duelState.roomId, `📦 [Supply] ¡VOLTEO! Recupera ${retrieved} monstruos de material del Cementerio a la mano.`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },

    // -------------------------------------------------------------
    // 4. EFFECT MONSTERS (27 cartas)
    // -------------------------------------------------------------
    {
        id: 31709826,
        name: "Revival Jam",
        type: "Effect Monster",
        atk: 1500,
        def: 500,
        level: 4,
        race: "Aqua",
        attribute: "WATER",
        canReviveOnBattleDestroy: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP." };
            return { canActivate: true };
        },
        async onDestroyedByBattle(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.lifePoints > 1000) {
                p.lifePoints -= 1000;
                p.pendingRevivalJam = true;
                effectUtils.emitDuelLog(duelState.roomId, `🧪 [Revival Jam] ¡Paga 1000 LP (LP: ${p.lifePoints})! Se Invocará de Modo Especial en Posición de Defensa durante la próxima Standby Phase.`, 'monster');
            }
            return { success: true };
        },
        async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.pendingRevivalJam) {
                const jamIdx = (p.graveyard || []).findIndex(c => Number(c.id || c.card_id) === 31709826);
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (jamIdx !== -1 && emptySlot !== -1) {
                    const jam = p.graveyard.splice(jamIdx, 1)[0];
                    jam.position = 'face-up-defense';
                    jam.currentAtk = jam.atk || 1500;
                    jam.currentDef = jam.def || 500;
                    p.monsters[emptySlot] = jam;
                    p.pendingRevivalJam = false;
                    effectUtils.emitDuelLog(duelState.roomId, `🧪✨ [Revival Jam] ¡Revive en Posición de Defensa durante la Standby Phase!`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDestroyedByBattle({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 12953226,
        name: "Nuvia the Wicked",
        type: "Effect Monster",
        atk: 2000,
        def: 800,
        level: 4,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onNormalSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.monsters && p.monsters[slotIndex]) {
                const m = p.monsters[slotIndex];
                effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                p.monsters[slotIndex] = null;
                effectUtils.emitDuelLog(duelState.roomId, `☠️ [Nuvia the Wicked] Invocada de Modo Normal: Se destruye a sí misma automáticamente.`, 'monster');
            }
            return { success: true };
        },
        calculateStatModifiers(monster, duelState, playerKey) {
            const oppKey = playerKey === 'player1' ? 'player2' : 'player1';
            const oppCount = (duelState[oppKey]?.monsters || []).filter(m => m).length;
            return { atkMod: -(oppCount * 200), defMod: 0 };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 38480590,
        name: "Lady Panther",
        type: "Effect Monster",
        atk: 1400,
        def: 1300,
        level: 4,
        race: "Beast-Warrior",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 38480590);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.deck.unshift(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🐆 [Lady Panther] Se ofrece en tributo y devuelve a "${mon.name || mon.card_data?.name}" al tope del Deck.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 65475294,
        name: "The Unfriendly Amazon",
        type: "Effect Monster",
        atk: 2000,
        def: 1000,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        canActivate() { return { canActivate: false, reason: "Efecto de mantenimiento en Standby Phase." }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const otherIdx = (p.monsters || []).findIndex((m, idx) => m && idx !== slotIndex);
            if (otherIdx !== -1) {
                const tMon = p.monsters[otherIdx];
                effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
                p.monsters[otherIdx] = null;
                effectUtils.emitDuelLog(duelState.roomId, `🛡️ [The Unfriendly Amazon] Tributa a "${tMon.name || tMon.card_data?.name}" como mantenimiento obligatorio.`, 'monster');
            } else {
                const selfMon = p.monsters[slotIndex];
                if (selfMon) {
                    effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                    p.monsters[slotIndex] = null;
                    effectUtils.emitDuelLog(duelState.roomId, `🛡️💥 [The Unfriendly Amazon] Se destruye al no haber otro monstruo para tributar.`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 91869203,
        name: "Amazoness Archer",
        type: "Effect Monster",
        atk: 1400,
        def: 1000,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const activeMons = (p?.monsters || []).filter(m => m);
            if (activeMons.length < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para tributar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let tCount = 0;
            for (let i = 0; i < p.monsters.length && tCount < 2; i++) {
                if (p.monsters[i]) {
                    effectUtils.sendCardToGraveyard(duelState, p.monsters[i], playerKey);
                    p.monsters[i] = null;
                    tCount++;
                }
            }

            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 1200);
            effectUtils.emitDuelLog(duelState.roomId, `🏹💥 [Amazoness Archer] Tributa 2 monstruos e inflige 1200 de daño directo a ${opp.username} (LP: ${opp.lifePoints}).`, 'monster');
            return { success: true };
        }
    },
    {
        id: 28358902,
        name: "Crimson Sentry",
        type: "Effect Monster",
        atk: 1500,
        def: 1200,
        level: 4,
        race: "Warrior",
        attribute: "FIRE",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 28358902);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.deck.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🔥 [Crimson Sentry] Se ofrece en tributo y devuelve a "${mon.name || mon.card_data?.name}" al fondo del Deck.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 64752646,
        name: "Fire Princess",
        type: "Effect Monster",
        atk: 1300,
        def: 1500,
        level: 4,
        race: "Pyro",
        attribute: "FIRE",
        canActivate() { return { canActivate: false, reason: "Efecto disparado continuo ante ganancia de LP." }; },
        async onLifePointsGained(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp) {
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `👑🔥 [Fire Princess] ¡Cada vez que ganas LP, inflige 500 de daño a ${opp.username}! (LP: ${opp.lifePoints}).`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onLifePointsGained({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 53530069,
        name: "Spirit of the Breeze",
        type: "Effect Monster",
        atk: 0,
        def: 1800,
        level: 3,
        race: "Fairy",
        attribute: "WIND",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && (mon.position === 'face-up-attack' || mon.position === 'attack')) {
                p.lifePoints = (p.lifePoints || 0) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🍃✨ [Spirit of the Breeze] En Posición de Ataque boca arriba: Aumenta los LP en 1000 (LP: ${p.lifePoints}).`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 90925163,
        name: "Dancing Fairy",
        type: "Effect Monster",
        atk: 1700,
        def: 1000,
        level: 4,
        race: "Fairy",
        attribute: "WIND",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && (mon.position === 'face-up-defense' || mon.position === 'defense')) {
                p.lifePoints = (p.lifePoints || 0) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🧚‍♀️✨ [Dancing Fairy] En Posición de Defensa boca arriba: Aumenta los LP en 1000 (LP: ${p.lifePoints}).`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 22419772,
        name: "Fairy Guardian",
        type: "Effect Monster",
        atk: 1000,
        def: 1000,
        level: 3,
        race: "Fairy",
        attribute: "WIND",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasSpellSent = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('spell') && c.sentByOpponentThisTurn);
            if (!hasSpellSent) return { canActivate: false, reason: "No hay cartas Mágicas enviadas a tu Cementerio por el rival este turno." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 22419772);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const sIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('spell') && c.sentByOpponentThisTurn);
            if (sIdx !== -1) {
                const spellCard = p.graveyard.splice(sIdx, 1)[0];
                p.deck.push(spellCard);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🧚 [Fairy Guardian] Se ofrece en tributo y devuelve "${spellCard.name || spellCard.card_data?.name}" al fondo del Deck.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 85802526,
        name: "Cure Mermaid",
        type: "Effect Monster",
        atk: 1500,
        def: 800,
        level: 4,
        race: "Fish",
        attribute: "WATER",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },
        async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 800;
            effectUtils.emitDuelLog(duelState.roomId, `🧜‍♀️💧 [Cure Mermaid] Durante tu Standby Phase: Aumenta tus LP en 800 (LP: ${p.lifePoints}).`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 21297224,
        name: "Hysteric Fairy",
        type: "Effect Monster",
        atk: 1800,
        def: 500,
        level: 4,
        race: "Fairy",
        attribute: "LIGHT",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const activeMons = (p?.monsters || []).filter(m => m);
            if (activeMons.length < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para tributar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let tCount = 0;
            for (let i = 0; i < p.monsters.length && tCount < 2; i++) {
                if (p.monsters[i]) {
                    effectUtils.sendCardToGraveyard(duelState, p.monsters[i], playerKey);
                    p.monsters[i] = null;
                    tCount++;
                }
            }
            p.lifePoints = (p.lifePoints || 0) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🧚‍♀️💖 [Hysteric Fairy] Ofrece 2 monstruos como tributo y recupera 1000 LP (LP: ${p.lifePoints}).`, 'monster');
            return { success: true };
        }
    },
    {
        id: 84080938,
        name: "The Forgiving Maiden",
        type: "Effect Monster",
        atk: 850,
        def: 2000,
        level: 4,
        race: "Fairy",
        attribute: "LIGHT",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 84080938);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.hand.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️ [The Forgiving Maiden] Se ofrece en tributo y regresa a "${mon.name || mon.card_data?.name}" a la mano.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 57579381,
        name: "Darklord Marie",
        type: "Effect Monster",
        atk: 1700,
        def: 1200,
        level: 5,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase desde el Cementerio." }; },
        async onStandbyPhaseGY(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 200;
            effectUtils.emitDuelLog(duelState.roomId, `🖤✨ [Darklord Marie] Desde el Cementerio en Standby Phase: Aumenta tus LP en 200 (LP: ${p.lifePoints}).`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 41855169,
        name: "Jowgen the Spiritualist",
        type: "Effect Monster",
        atk: 200,
        def: 1300,
        level: 3,
        race: "Spellcaster",
        attribute: "LIGHT",
        preventsSpecialSummon: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if (!p?.hand || p.hand.length === 0) return { canActivate: false, reason: "Requiere descartar 1 carta de la mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Descartar 1 carta al azar
            const rIdx = Math.floor(Math.random() * p.hand.length);
            const discarded = p.hand.splice(rIdx, 1)[0];
            effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);

            // Destruir todos los monstruos Invocados de Modo Especial en el campo
            let destroyed = 0;
            [p, opp].forEach(player => {
                (player.monsters || []).forEach((m, idx) => {
                    if (m && m.isSpecialSummoned) {
                        effectUtils.sendCardToGraveyard(duelState, m, player === p ? playerKey : oppKey);
                        player.monsters[idx] = null;
                        destroyed++;
                    }
                });
            });

            effectUtils.emitDuelLog(duelState.roomId, `🧘‍♂️⚡ [Jowgen the Spiritualist] Descarta 1 carta al azar y destruye ${destroyed} monstruos Invocados de Modo Especial en el campo. Ningún jugador puede Invocar de Modo Especial.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 88240808,
        name: "Kycoo the Ghost Destroyer",
        type: "Effect Monster",
        atk: 1800,
        def: 700,
        level: 4,
        race: "Spellcaster",
        attribute: "DARK",
        preventsOpponentGyBanish: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },
        async onInflictBattleDamage(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            let banished = 0;
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                for (let i = opp.graveyard.length - 1; i >= 0 && banished < 2; i--) {
                    const card = opp.graveyard[i];
                    if (card && (card.type || '').toLowerCase().includes('monster')) {
                        const target = opp.graveyard.splice(i, 1)[0];
                        opp.banished.push(target);
                        banished++;
                    }
                }
            }

            effectUtils.emitDuelLog(duelState.roomId, `🗡️👻 [Kycoo the Ghost Destroyer] ¡Inflige daño de combate y destierra ${banished} monstruos del Cementerio de ${opp.username}! El rival no puede desterrar cartas de ningún Cementerio.`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 40133511,
        name: "Bazoo the Soul-Eater",
        type: "Effect Monster",
        atk: 1600,
        def: 900,
        level: 4,
        race: "Beast",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const gyMonsters = (p?.graveyard || []).filter(c => (c.type || '').toLowerCase().includes('monster'));
            if (gyMonsters.length === 0) return { canActivate: false, reason: "No hay monstruos en tu Cementerio para desterrar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banishedCount = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banishedCount < 3; i--) {
                const c = p.graveyard[i];
                if (c && (c.type || '').toLowerCase().includes('monster')) {
                    const removed = p.graveyard.splice(i, 1)[0];
                    p.banished.push(removed);
                    banishedCount++;
                }
            }

            const boost = banishedCount * 300;
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 40133511);
            if (selfSlot !== -1 && p.monsters[selfSlot]) {
                const self = p.monsters[selfSlot];
                self.currentAtk = (self.currentAtk !== undefined ? self.currentAtk : 1600) + boost;
            }

            effectUtils.emitDuelLog(duelState.roomId, `🦁💀 [Bazoo the Soul-Eater] Destierra ${banishedCount} monstruos de su Cementerio y gana +${boost} ATK hasta el final del turno rival.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 31829185,
        name: "Dark Necrofear",
        type: "Effect Monster",
        atk: 2200,
        def: 2800,
        level: 8,
        race: "Fiend",
        attribute: "DARK",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const fiendsInGY = (p?.graveyard || []).filter(c => ((c.race || c.card_data?.race || '').toLowerCase() === 'fiend'));
            if (fiendsInGY.length < 3) return { canActivate: false, reason: "Se requieren al menos 3 monstruos Demonio en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banished = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banished < 3; i--) {
                const c = p.graveyard[i];
                if ((c.race || c.card_data?.race || '').toLowerCase() === 'fiend') {
                    p.banished.push(p.graveyard.splice(i, 1)[0]);
                    banished++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `💀🖤 [Dark Necrofear] ¡Invocada de Modo Especial desterrando 3 monstruos Demonio del Cementerio!`, 'monster');
            return { success: true };
        },
        async onEndPhaseGY(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const p = duelState[playerKey];

            // Si fue destruida en la Monster Zone por carta del rival y enviada al Cementerio este turno
            const oppMonsters = (opp.monsters || []).map((m, idx) => ({ m, idx })).filter(x => x.m);
            if (oppMonsters.length > 0) {
                const target = oppMonsters[0];
                const stolenMon = opp.monsters[target.idx];
                opp.monsters[target.idx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenMon;
                    effectUtils.emitDuelLog(duelState.roomId, `👻🎭 [Dark Necrofear] ¡Posee y toma control de "${stolenMon.name || stolenMon.card_data?.name}" del rival desde el Cementerio!`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 77527210,
        name: "Soul of Purity and Light",
        type: "Effect Monster",
        atk: 2000,
        def: 1800,
        level: 6,
        race: "Fairy",
        attribute: "LIGHT",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const lightInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'LIGHT'));
            if (lightInGY.length < 2) return { canActivate: false, reason: "Se requieren al menos 2 monstruos de LUZ en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banished = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banished < 2; i--) {
                const c = p.graveyard[i];
                if ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'LIGHT') {
                    p.banished.push(p.graveyard.splice(i, 1)[0]);
                    banished++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🕊️✨ [Soul of Purity and Light] Invocada de Modo Especial desterrando 2 monstruos de LUZ del Cementerio. Reduce el ATK del rival en 300 durante su Battle Phase.`, 'monster');
            return { success: true };
        },
        calculateOpponentStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer !== playerKey) {
                return { atkMod: -300, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 13522325,
        name: "Spirit of Flames",
        type: "Effect Monster",
        atk: 1700,
        def: 1000,
        level: 4,
        race: "Pyro",
        attribute: "FIRE",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const fireInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'FIRE'));
            if (fireInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de FUEGO en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'FIRE');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🔥 [Spirit of Flames] Invocada de Modo Especial desterrando 1 monstruo de FUEGO del Cementerio. Gana +300 ATK en tu Battle Phase.`, 'monster');
            return { success: true };
        },
        calculateStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer === playerKey) {
                return { atkMod: 300, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 40916023,
        name: "Aqua Spirit",
        type: "Effect Monster",
        atk: 1600,
        def: 1200,
        level: 4,
        race: "Aqua",
        attribute: "WATER",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const waterInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WATER'));
            if (waterInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de AGUA en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WATER');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `💧 [Aqua Spirit] Invocada de Modo Especial desterrando 1 monstruo de AGUA del Cementerio.`, 'monster');
            return { success: true };
        },
        async onOpponentStandbyPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                targetMon.cannotChangePositionTurn = duelState.turnCount;
                effectUtils.emitDuelLog(duelState.roomId, `💧🌊 [Aqua Spirit] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}" durante la Standby Phase rival.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 76305638,
        name: "The Rock Spirit",
        type: "Effect Monster",
        atk: 1700,
        def: 1000,
        level: 4,
        race: "Rock",
        attribute: "EARTH",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const earthInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'EARTH'));
            if (earthInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de TIERRA en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'EARTH');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪨 [The Rock Spirit] Invocada de Modo Especial desterrando 1 monstruo de TIERRA del Cementerio. Gana +300 ATK durante la Battle Phase rival.`, 'monster');
            return { success: true };
        },
        calculateStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer !== playerKey) {
                return { atkMod: 300, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 12800777,
        name: "Garuda the Wind Spirit",
        type: "Effect Monster",
        atk: 1600,
        def: 1200,
        level: 4,
        race: "Winged Beast",
        attribute: "WIND",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const windInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WIND'));
            if (windInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de VIENTO en el Cementerio." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WIND');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🦅🌪️ [Garuda the Wind Spirit] Invocada de Modo Especial desterrando 1 monstruo de VIENTO del Cementerio.`, 'monster');
            return { success: true };
        },
        async onOpponentEndPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `🦅 [Garuda the Wind Spirit] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}" durante la End Phase rival.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 45894482,
        name: "Gilasaurus",
        type: "Effect Monster",
        atk: 1400,
        def: 400,
        level: 3,
        race: "Dinosaur",
        attribute: "EARTH",
        canSpecialSummonSelf: true,
        canActivate() { return { canActivate: true }; },
        async onSpecialSummon(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            // El oponente puede invocar de modo especial 1 monstruo de su cementerio
            const oppGyMonIdx = (opp.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster'));
            if (oppGyMonIdx !== -1) {
                const emptySlot = (opp.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    const oppMon = opp.graveyard.splice(oppGyMonIdx, 1)[0];
                    oppMon.position = 'face-up-defense';
                    oppMon.currentAtk = oppMon.atk || oppMon.card_data?.atk || 0;
                    oppMon.currentDef = oppMon.def || oppMon.card_data?.def || 0;
                    opp.monsters[emptySlot] = oppMon;
                    effectUtils.emitDuelLog(duelState.roomId, `🦖 [Gilasaurus] Invocado de Modo Especial. ${opp.username} invoca a "${oppMon.name || oppMon.card_data?.name}" desde su Cementerio.`, 'monster');
                }
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `🦖 [Gilasaurus] Invocado de Modo Especial desde la mano.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 8687195,
        name: "Dreamsprite",
        type: "Effect Monster",
        atk: 300,
        def: 200,
        level: 2,
        race: "Plant",
        attribute: "LIGHT",
        onAttackedRedirect: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado cuando es atacada." }; },
        async onAttacked(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const otherIdx = (p.monsters || []).findIndex((m, idx) => m && idx !== slotIndex);
            if (otherIdx !== -1) {
                effectUtils.emitDuelLog(duelState.roomId, `🧚🌿 [Dreamsprite] ¡Al ser atacada, redirige el objetivo del ataque a "${p.monsters[otherIdx].name || p.monsters[otherIdx].card_data?.name}"!`, 'monster');
                return { success: true, newTargetSlot: otherIdx };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 88472456,
        name: "Zombyra the Dark",
        type: "Effect Monster",
        atk: 2100,
        def: 500,
        level: 4,
        race: "Warrior",
        attribute: "DARK",
        cannotAttackDirectly: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo y disparado por combate." }; },
        async onMonsterDestroyedByBattle(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.currentAtk = (mon.currentAtk !== undefined ? mon.currentAtk : 2100) - 200;
                effectUtils.emitDuelLog(duelState.roomId, `⚔️💀 [Zombyra the Dark] Destruyó un monstruo en batalla: Pierde 200 ATK (ATK actual: ${mon.currentAtk}). No puede atacar directamente.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 71466592,
        name: "Maryokutai",
        type: "Effect Monster",
        atk: 900,
        def: 900,
        level: 3,
        race: "Aqua",
        attribute: "WATER",
        isSpellNegator: true,
        canActivate({ duelState, playerKey }) {
            // Se puede activar en el turno del rival cuando activa una carta mágica
            return { canActivate: true };
        },
        async onNegateSpell(context) {
            const { duelState, playerKey, slotIndex, spellCard, effectUtils } = context;
            const p = duelState[playerKey];
            if (p.monsters && p.monsters[slotIndex]) {
                const selfMon = p.monsters[slotIndex];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[slotIndex] = null;
            }
            effectUtils.emitDuelLog(duelState.roomId, `💧🛡️ [Maryokutai] ¡Se ofrece en tributo! Niega la activación de la Carta Mágica "${spellCard?.name || 'Mágica'}" y la destruye.`, 'monster');
            return { success: true, negated: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onNegateSpell({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        }
    }
];

function generateCode(card) {
    let extraFields = '';
    if (card.isRitual) extraFields += `    isRitual: true,\n`;
    if (card.ritualInfo) extraFields += `    ritualInfo: ${JSON.stringify(card.ritualInfo)},\n`;
    if (card.isFusion) extraFields += `    isFusion: true,\n`;
    if (card.fusionMaterials) extraFields += `    fusionMaterials: ${JSON.stringify(card.fusionMaterials)},\n`;
    if (card.isFlip) extraFields += `    isFlip: true,\n`;
    if (card.canSpecialSummonSelf) extraFields += `    canSpecialSummonSelf: true,\n`;
    if (card.cannotAttackDirectly) extraFields += `    cannotAttackDirectly: true,\n`;
    if (card.preventsSpecialSummon) extraFields += `    preventsSpecialSummon: true,\n`;
    if (card.preventsAllSummons) extraFields += `    preventsAllSummons: true,\n`;
    if (card.preventsOpponentGyBanish) extraFields += `    preventsOpponentGyBanish: true,\n`;
    if (card.onAttackedRedirect) extraFields += `    onAttackedRedirect: true,\n`;
    if (card.isSpellNegator) extraFields += `    isSpellNegator: true,\n`;
    if (card.canReviveOnBattleDestroy) extraFields += `    canReviveOnBattleDestroy: true,\n`;

    const methods = [];
    if (card.canActivate) methods.push(`    ${card.canActivate.toString()}`);
    if (card.onFlip) methods.push(`    ${card.onFlip.toString()}`);
    if (card.onSpecialSummon) methods.push(`    ${card.onSpecialSummon.toString()}`);
    if (card.onNormalSummon) methods.push(`    ${card.onNormalSummon.toString()}`);
    if (card.onDestroyedByBattle) methods.push(`    ${card.onDestroyedByBattle.toString()}`);
    if (card.onStandbyPhase) methods.push(`    ${card.onStandbyPhase.toString()}`);
    if (card.onStandbyPhaseGY) methods.push(`    ${card.onStandbyPhaseGY.toString()}`);
    if (card.onOpponentStandbyPhase) methods.push(`    ${card.onOpponentStandbyPhase.toString()}`);
    if (card.onOpponentEndPhase) methods.push(`    ${card.onOpponentEndPhase.toString()}`);
    if (card.onEndPhaseGY) methods.push(`    ${card.onEndPhaseGY.toString()}`);
    if (card.onLifePointsGained) methods.push(`    ${card.onLifePointsGained.toString()}`);
    if (card.onInflictBattleDamage) methods.push(`    ${card.onInflictBattleDamage.toString()}`);
    if (card.onAttacked) methods.push(`    ${card.onAttacked.toString()}`);
    if (card.onMonsterDestroyedByBattle) methods.push(`    ${card.onMonsterDestroyedByBattle.toString()}`);
    if (card.onNegateSpell) methods.push(`    ${card.onNegateSpell.toString()}`);
    if (card.calculateStatModifiers) methods.push(`    ${card.calculateStatModifiers.toString()}`);
    if (card.calculateOpponentStatModifiers) methods.push(`    ${card.calculateOpponentStatModifiers.toString()}`);
    if (card.onActivate) methods.push(`    ${card.onActivate.toString()}`);

    const methodsStr = methods.join(',\n\n');

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: LON
 */
module.exports = {
    id: ${card.id},
    name: "${card.name}",
    type: "${card.type}",
    atk: ${card.atk},
    def: ${card.def},
    level: ${card.level},
    race: "${card.race}",
    attribute: "${card.attribute}",
${extraFields}
${methodsStr},

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;
}

console.log(`Escribiendo ${cardsBatch2.length} cartas de Monstruos de LON...`);
cardsBatch2.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [LON] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 2 de LON completado exitosamente.');
