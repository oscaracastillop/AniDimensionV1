/**
 * Script de implementación de alta fidelidad para Monstruos de LOD (46 cartas)
 * Expansión: Legacy of Darkness (LOD)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch2 = [
    // -------------------------------------------------------------
    // FUSION MONSTERS (5 cartas)
    // -------------------------------------------------------------
    {
        id: 80071763,
        name: "Dark Balter the Terrible",
        type: "Fusion Effect Monster",
        atk: 2000,
        def: 1200,
        level: 5,
        race: "Fiend",
        attribute: "DARK",
        isFusion: true,
        fusionMaterials: [52860176, 38742075], // Possessed Dark Soul + Frontier Wiseman
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Requiere pagar 1000 LP." };
            return { canActivate: true };
        },
        async onNegateSpell(context) {
            const { duelState, playerKey, spellCard, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) {
                p.lifePoints -= 1000;
                effectUtils.emitDuelLog(duelState.roomId, `👿🚫 [Dark Balter the Terrible] Paga 1000 LP (LP: ${p.lifePoints}) y niega la Carta Mágica Normal "${spellCard?.name || 'Mágica'}".`, 'monster');
                return { success: true, negated: true };
            }
            return { success: false };
        },
        async onMonsterDestroyedByBattle(context) {
            const { duelState, destroyedMonster, effectUtils } = context;
            if (destroyedMonster) {
                destroyedMonster.effectsNegated = true;
                effectUtils.emitDuelLog(duelState.roomId, `👿💀 [Dark Balter the Terrible] Destruyó a "${destroyedMonster.name || destroyedMonster.card_data?.name}" en combate y niega sus efectos de forma permanente.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 49868263,
        name: "Ryu Senshi",
        type: "Fusion Effect Monster",
        atk: 2000,
        def: 1200,
        level: 6,
        race: "Warrior",
        attribute: "EARTH",
        isFusion: true,
        fusionMaterials: [75953262, 67957315], // Warrior Dai Grepher + Spirit Ryu
        immuneToSpellTargeting: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Requiere pagar 1000 LP." };
            return { canActivate: true };
        },
        async onNegateTrap(context) {
            const { duelState, playerKey, trapCard, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) {
                p.lifePoints -= 1000;
                effectUtils.emitDuelLog(duelState.roomId, `⚔️🚫 [Ryu Senshi] Paga 1000 LP (LP: ${p.lifePoints}) y niega la Carta de Trampa Normal "${trapCard?.name || 'Trampa'}". Inmune a efectos de Magias que lo designen.`, 'monster');
                return { success: true, negated: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 66235877,
        name: "Fiend Skull Dragon",
        type: "Fusion Effect Monster",
        atk: 2000,
        def: 1200,
        level: 5,
        race: "Dragon",
        attribute: "WIND",
        isFusion: true,
        fusionMaterials: [93220472, 16475472], // Cave Dragon + Lesser Fiend
        negatesFlipEffects: true,
        immuneToTrapTargeting: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 75923050,
        name: "Super Robolady",
        type: "Fusion Effect Monster",
        atk: 1200,
        def: 500,
        level: 6,
        race: "Machine",
        attribute: "EARTH",
        isFusion: true,
        fusionMaterials: [23643617, 48766543], // Robolady + Cyber-Tech Alligator
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🤖 [Super Robolady] En la Main Phase puede intercambiarse con "Super Roboyarou".`, 'monster');
            return { success: true };
        }
    },
    {
        id: 1412158,
        name: "Super Roboyarou",
        type: "Fusion Effect Monster",
        atk: 1200,
        def: 500,
        level: 6,
        race: "Machine",
        attribute: "EARTH",
        isFusion: true,
        fusionMaterials: [38916461, 48766543], // Roboyarou + Cyber-Tech Alligator
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🤖 [Super Roboyarou] En la Main Phase puede intercambiarse con "Super Robolady".`, 'monster');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // FLIP EFFECT MONSTERS (4 cartas)
    // -------------------------------------------------------------
    {
        id: 1347977,
        name: "Mysterious Guard",
        type: "Flip Effect Monster",
        atk: 800,
        def: 1200,
        level: 3,
        race: "Spellcaster",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                opp.deck.unshift(targetMon);
                effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️ [Mysterious Guard] ¡VOLTEO! Devuelve a "${targetMon.name || targetMon.card_data?.name}" al tope del Deck rival.`, 'flip');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 37620434,
        name: "Shadow Tamer",
        type: "Flip Effect Monster",
        atk: 800,
        def: 700,
        level: 3,
        race: "Warrior",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targetFiendIdx = (opp.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (targetFiendIdx !== -1) {
                const stolenFiend = opp.monsters[targetFiendIdx];
                opp.monsters[targetFiendIdx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenFiend;
                    effectUtils.emitDuelLog(duelState.roomId, `⛓️👿 [Shadow Tamer] ¡VOLTEO! Toma el control de "${stolenFiend.name || stolenFiend.card_data?.name}" del rival hasta el final del turno.`, 'flip');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 63018132,
        name: "Dragon Manipulator",
        type: "Flip Effect Monster",
        atk: 700,
        def: 800,
        level: 3,
        race: "Warrior",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targetDragonIdx = (opp.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (targetDragonIdx !== -1) {
                const stolenDragon = opp.monsters[targetDragonIdx];
                opp.monsters[targetDragonIdx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenDragon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉🪈 [Dragon Manipulator] ¡VOLTEO! Toma el control de "${stolenDragon.name || stolenDragon.card_data?.name}" del rival hasta el final del turno.`, 'flip');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 78706415,
        name: "Fiber Jar",
        type: "Flip Effect Monster",
        atk: 500,
        def: 500,
        level: 3,
        race: "Plant",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Ambos jugadores barajan mano, campo y cementerio al mazo y roban 5 cartas
            [p, opp].forEach(pl => {
                (pl.monsters || []).forEach(m => { if (m) pl.deck.push(m); });
                pl.monsters = [null, null, null, null, null];
                (pl.spells || []).forEach(s => { if (s) pl.deck.push(s); });
                pl.spells = [null, null, null, null, null];
                (pl.hand || []).forEach(c => { pl.deck.push(c); });
                pl.hand = [];
                (pl.graveyard || []).forEach(c => { pl.deck.push(c); });
                pl.graveyard = [];

                pl.deck.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 5 && pl.deck.length > 0; i++) {
                    pl.hand.push(pl.deck.shift());
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🏺🌀 [Fiber Jar] ¡VOLTEO! ¡REINICIO TOTAL! Ambos jugadores barajan manos, campos y Cementerios a sus Decks y roban 5 cartas nuevas.`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },

    // -------------------------------------------------------------
    // SPIRIT EFFECT MONSTERS (10 cartas)
    // -------------------------------------------------------------
    {
        id: 3078576,
        name: "Yata-Garasu",
        type: "Spirit Effect Monster",
        atk: 200,
        def: 100,
        level: 2,
        race: "Fiend",
        attribute: "WIND",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },
        async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.skipNextDrawPhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `🦅🔒 [Yata-Garasu] ¡BLOQUEO YATA! Infligió daño de batalla a ${opp.username}: El rival saltará su próximo Draw Phase por completo.`, 'monster');
            }
            return { success: true };
        },
        async onEndPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.monsters?.[slotIndex]) {
                const mon = p.monsters[slotIndex];
                p.monsters[slotIndex] = null;
                p.hand.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🦅 [Yata-Garasu] Regresa del campo a la mano de su dueño durante la End Phase.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, opponentKey, effectUtils });
        }
    },
    {
        id: 40695128,
        name: "Maharaghi",
        type: "Spirit Effect Monster",
        atk: 1200,
        def: 1700,
        level: 4,
        race: "Rock",
        attribute: "EARTH",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto de invocación/volteo." }; },
        async onSummonOrFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.deck && p.deck.length > 0) {
                const topCard = p.deck[0];
                effectUtils.emitDuelLog(duelState.roomId, `🗿🔮 [Maharaghi] Mira la carta del tope del Deck: "${topCard.name || topCard.card_data?.name}". Puedes colocarla en el fondo o mantenerla arriba.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSummonOrFlip({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 77084837,
        name: "Inaba White Rabbit",
        type: "Spirit Effect Monster",
        atk: 700,
        def: 500,
        level: 3,
        race: "Beast",
        attribute: "EARTH",
        isSpirit: true,
        cannotSpecialSummon: true,
        canAttackDirectly: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de ataque directo." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 40473581,
        name: "Susa Soldier",
        type: "Spirit Effect Monster",
        atk: 2000,
        def: 1600,
        level: 4,
        race: "Thunder",
        attribute: "EARTH",
        isSpirit: true,
        cannotSpecialSummon: true,
        battleDamageHalved: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 76862289,
        name: "Yamata Dragon",
        type: "Spirit Effect Monster",
        atk: 2600,
        def: 3100,
        level: 7,
        race: "Dragon",
        attribute: "FIRE",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },
        async onInflictBattleDamage(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.hand = p.hand || [];
            let drawn = 0;
            while (p.hand.length < 5 && p.deck && p.deck.length > 0) {
                p.hand.push(p.deck.shift());
                drawn++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `🐉🔥 [Yamata Dragon] ¡Infligió daño de combate! Roba ${drawn} cartas hasta tener 5 en la mano.`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 2356994,
        name: "Great Long Nose",
        type: "Spirit Effect Monster",
        atk: 1900,
        def: 1700,
        level: 5,
        race: "Beast-Warrior",
        attribute: "DARK",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },
        async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.skipNextBattlePhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `👺 [Great Long Nose] Infligió daño de batalla: ${opp.username} saltará su próxima Battle Phase.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, opponentKey, effectUtils });
        }
    },
    {
        id: 39751093,
        name: "Otohime",
        type: "Spirit Effect Monster",
        atk: 0,
        def: 100,
        level: 3,
        race: "Spellcaster",
        attribute: "LIGHT",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: true }; },
        async onSummonOrFlip(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `👸✨ [Otohime] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}".`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSummonOrFlip({ duelState, opponentKey, effectUtils });
        }
    },
    {
        id: 75745607,
        name: "Hino-Kagu-Tsuchi",
        type: "Spirit Effect Monster",
        atk: 2800,
        def: 2900,
        level: 8,
        race: "Pyro",
        attribute: "FIRE",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },
        async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.discardHandNextDrawPhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Hino-Kagu-Tsuchi] ¡Llamarada destructiva! ${opp.username} deberá descartar toda su mano durante su próximo Draw Phase antes de robar.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, opponentKey, effectUtils });
        }
    },
    {
        id: 2134346,
        name: "Asura Priest",
        type: "Spirit Effect Monster",
        atk: 1700,
        def: 1200,
        level: 4,
        race: "Fairy",
        attribute: "LIGHT",
        isSpirit: true,
        cannotSpecialSummon: true,
        canAttackAllMonsters: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de ataque múltiple." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 38538445,
        name: "Fushi No Tori",
        type: "Spirit Effect Monster",
        atk: 1200,
        def: 0,
        level: 4,
        race: "Winged Beast",
        attribute: "FIRE",
        isSpirit: true,
        cannotSpecialSummon: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },
        async onInflictBattleDamage(context) {
            const { duelState, playerKey, damageAmount, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + (damageAmount || 1200);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🦅 [Fushi No Tori] Recupera LP igual al daño infligido (+${damageAmount || 1200} LP, LP: ${p.lifePoints}).`, 'monster');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, effectUtils });
        }
    },

    // -------------------------------------------------------------
    // EFFECT MONSTERS (27 cartas)
    // -------------------------------------------------------------
    {
        id: 53982768,
        name: "Dark Ruler Ha Des",
        type: "Effect Monster",
        atk: 2450,
        def: 1600,
        level: 6,
        race: "Fiend",
        attribute: "DARK",
        cannotSpecialSummonFromGY: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onFiendDestroyedMonsterByBattle(context) {
            const { duelState, destroyedMonster, effectUtils } = context;
            if (destroyedMonster) {
                destroyedMonster.effectsNegated = true;
                effectUtils.emitDuelLog(duelState.roomId, `👑👿 [Dark Ruler Ha Des] El Demonio destruyó a "${destroyedMonster.name || destroyedMonster.card_data?.name}" en combate: Niega sus efectos de forma permanente.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 16475472,
        name: "Lesser Fiend",
        type: "Effect Monster",
        atk: 2100,
        def: 1000,
        level: 5,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de combate." }; },
        async onMonsterDestroyedByBattle(context) {
            const { duelState, opponentKey, destroyedMonster, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (destroyedMonster && opp) {
                opp.banished = opp.banished || [];
                opp.banished.push(destroyedMonster);
                effectUtils.emitDuelLog(duelState.roomId, `👿🌀 [Lesser Fiend] Destierra del juego al monstruo que destruyó en combate ("${destroyedMonster.name || destroyedMonster.card_data?.name}").`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 52860176,
        name: "Possessed Dark Soul",
        type: "Effect Monster",
        atk: 1200,
        def: 800,
        level: 3,
        race: "Fiend",
        attribute: "DARK",
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasL3 = (duelState[oppKey]?.monsters || []).some(m => m && (m.level || m.card_data?.level || 0) <= 3);
            if (!hasL3) return { canActivate: false, reason: "El rival no tiene monstruos de Nivel 3 o menor boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Se ofrece en tributo a sí mismo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 52860176);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }

            let stolenCount = 0;
            (opp.monsters || []).forEach((m, idx) => {
                if (m && (m.level || m.card_data?.level || 0) <= 3) {
                    const emptySlot = p.monsters.findIndex(slot => !slot);
                    if (emptySlot !== -1) {
                        opp.monsters[idx] = null;
                        p.monsters[emptySlot] = m;
                        stolenCount++;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `👻👿 [Possessed Dark Soul] Se tributa y toma el control de ${stolenCount} monstruos de Nivel 3 o menor del rival.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 89258225,
        name: "Winged Minion",
        type: "Effect Monster",
        atk: 700,
        def: 700,
        level: 2,
        race: "Fiend",
        attribute: "DARK",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiend = (p?.monsters || []).some(m => m && Number(m.card_id || m.card_data?.id) !== 89258225 && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (!hasFiend) return { canActivate: false, reason: "Debes controlar otro monstruo Demonio para aumentar su poder." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 89258225);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }
            const targetFiend = (p.monsters || []).find(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (targetFiend) {
                targetFiend.currentAtk = (targetFiend.currentAtk !== undefined ? targetFiend.currentAtk : (targetFiend.card_data?.atk || 0)) + 700;
                targetFiend.currentDef = (targetFiend.currentDef !== undefined ? targetFiend.currentDef : (targetFiend.card_data?.def || 0)) + 700;
                effectUtils.emitDuelLog(duelState.roomId, `🦇✨ [Winged Minion] Se ofrece en tributo y otorga +700 ATK/DEF a "${targetFiend.name || targetFiend.card_data?.name}".`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 15653824,
        name: "Skull Knight #2",
        type: "Effect Monster",
        atk: 1000,
        def: 1200,
        level: 3,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto disparado al ser tributado." }; },
        async onTributedForFiend(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const deckIdx = (p.deck || []).findIndex(c => Number(c.id || c.card_id) === 15653824);
            if (deckIdx !== -1) {
                const knight = p.deck.splice(deckIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    knight.position = 'face-up-attack';
                    p.monsters[emptySlot] = knight;
                    effectUtils.emitDuelLog(duelState.roomId, `💀🛡️ [Skull Knight #2] ¡Tributado por un Demonio! Invoca de Modo Especial otro "Skull Knight #2" desde el Deck.`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 42647539,
        name: "Ryu-Kishin Clown",
        type: "Effect Monster",
        atk: 800,
        def: 500,
        level: 2,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto de invocación/volteo." }; },
        async onSummonOrFlip(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.position = mon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `🤡 [Ryu-Kishin Clown] Cambia su posición de batalla inmediatamente.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 88132637,
        name: "Twin-Headed Wolf",
        type: "Effect Monster",
        atk: 1500,
        def: 1000,
        level: 4,
        race: "Fiend",
        attribute: "DARK",
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 49681811,
        name: "Freed the Matchless General",
        type: "Effect Monster",
        atk: 2300,
        def: 1700,
        level: 5,
        race: "Warrior",
        attribute: "EARTH",
        immuneToSpellTargeting: true,
        canActivate() { return { canActivate: true }; },
        async onDrawPhaseReplace(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const wIdx = (p.deck || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (wIdx !== -1) {
                const warrior = p.deck.splice(wIdx, 1)[0];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🎖️ [Freed the Matchless General] En lugar de robar, añade a "${warrior.name || warrior.card_data?.name}" (Guerrero Nv.${warrior.level || warrior.card_data?.level}) a la mano. Inmune a Magias dirigidas.`, 'monster');
                return { success: true, drawReplaced: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDrawPhaseReplace({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 76075810,
        name: "Throwstone Unit",
        type: "Effect Monster",
        atk: 900,
        def: 2000,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarrior = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            if (!hasWarrior) return { canActivate: false, reason: "Debes tributar 1 monstruo Guerrero." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const wIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            let tAtk = 900;
            if (wIdx !== -1) {
                tAtk = p.monsters[wIdx].currentAtk || p.monsters[wIdx].card_data?.atk || 900;
                effectUtils.sendCardToGraveyard(duelState, p.monsters[wIdx], playerKey);
                p.monsters[wIdx] = null;
            }

            const targetMon = (opp.monsters || []).find(m => m && (m.currentDef || m.card_data?.def || 0) <= tAtk);
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                effectUtils.sendCardToGraveyard(duelState, targetMon, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `🪨💥 [Throwstone Unit] Tributa un Guerrero y destruye a "${targetMon.name || targetMon.card_data?.name}" (DEF <= ${tAtk}).`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 2460565,
        name: "Marauding Captain",
        type: "Effect Monster",
        atk: 1200,
        def: 400,
        level: 3,
        race: "Warrior",
        attribute: "EARTH",
        preventsOtherWarriorAttacks: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasL4Mon = (p?.hand || []).some(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 4);
            if (!hasL4Mon) return { canActivate: false, reason: "No hay monstruos de Nivel 4 o menor en la mano." };
            return { canActivate: true };
        },
        async onNormalSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const hIdx = (p.hand || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 4);
            if (hIdx !== -1) {
                const mon = p.hand.splice(hIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    mon.position = 'face-up-attack';
                    mon.currentAtk = mon.atk || mon.card_data?.atk || 0;
                    mon.currentDef = mon.def || mon.card_data?.def || 0;
                    p.monsters[emptySlot] = mon;
                    effectUtils.emitDuelLog(duelState.roomId, `⚔️🛡️ [Marauding Captain] ¡Invocación Normal exitosa! Invoca de Modo Especial a "${mon.name || mon.card_data?.name}" desde la mano. El rival no puede atacar a otros Guerreros.`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onNormalSummon({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 38742075,
        name: "Frontier Wiseman",
        type: "Effect Monster",
        atk: 1600,
        def: 800,
        level: 3,
        race: "Spellcaster",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️ [Frontier Wiseman] Envía 1 monstruo al Cementerio para negar una Magia que designe a un Guerrero.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 74131780,
        name: "Exiled Force",
        type: "Effect Monster",
        atk: 1000,
        def: 1000,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasTarget = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos en el campo rival para destruir." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Se ofrece en tributo a sí mismo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 74131780);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }

            // Destruye 1 monstruo objetivo
            const tMon = (opp.monsters || []).find(m => m);
            if (tMon) {
                const idx = opp.monsters.indexOf(tMon);
                opp.monsters[idx] = null;
                effectUtils.sendCardToGraveyard(duelState, tMon, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `🗡️💥 [Exiled Force] ¡Se ofrece en tributo! Destruye a "${tMon.name || tMon.card_data?.name}" en el campo rival.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 1525329,
        name: "The Hunter with 7 Weapons",
        type: "Effect Monster",
        atk: 1000,
        def: 600,
        level: 3,
        race: "Warrior",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onNormalSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.declaredHunterType = 'Dragon';
                mon.currentAtk = (mon.currentAtk || 1000) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🏹⚔️ [The Hunter with 7 Weapons] Declara Tipo (Dragon) y gana +1000 ATK contra monstruos de ese Tipo (ATK: ${mon.currentAtk}).`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 94568601,
        name: "Tyrant Dragon",
        type: "Effect Monster",
        atk: 2900,
        def: 2500,
        level: 8,
        race: "Dragon",
        attribute: "FIRE",
        canAttackTwiceIfOpponentControlsMonsters: true,
        immuneToTrapTargeting: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de combate." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 31553716,
        name: "Spear Dragon",
        type: "Effect Monster",
        atk: 1900,
        def: 0,
        level: 4,
        race: "Dragon",
        attribute: "WIND",
        hasPiercing: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de combate." }; },
        async onAfterAttack(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && mon.position.includes('attack')) {
                mon.position = 'face-up-defense';
                effectUtils.emitDuelLog(duelState.roomId, `🐉🛡️ [Spear Dragon] Tras atacar con daño de penetración, cambia automáticamente a Posición de Defensa.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 67957315,
        name: "Spirit Ryu",
        type: "Effect Monster",
        atk: 1000,
        def: 1000,
        level: 4,
        race: "Dragon",
        attribute: "WIND",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragonInHand = (p?.hand || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragonInHand) return { canActivate: false, reason: "Requiere descartar 1 monstruo Dragón de la mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const dIdx = (p.hand || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'dragon');
            if (dIdx !== -1) {
                const discarded = p.hand.splice(dIdx, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 67957315);
                if (selfSlot !== -1 && p.monsters[selfSlot]) {
                    p.monsters[selfSlot].currentAtk = (p.monsters[selfSlot].currentAtk || 1000) + 1000;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Spirit Ryu] Descarta a "${discarded.name || discarded.card_data?.name}" y gana +1000 ATK durante el cálculo de daño (ATK: ${p.monsters[selfSlot].currentAtk}).`, 'monster');
                }
            }
            return { success: true };
        }
    },
    {
        id: 93220472,
        name: "Cave Dragon",
        type: "Effect Monster",
        atk: 2000,
        def: 100,
        level: 4,
        race: "Dragon",
        attribute: "WIND",
        requiresOtherMonsterToSummon: true,
        requiresOtherDragonToAttack: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 29618570,
        name: "Gray Wing",
        type: "Effect Monster",
        atk: 1300,
        def: 700,
        level: 3,
        race: "Dragon",
        attribute: "WIND",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if (!p?.hand || p.hand.length === 0) return { canActivate: false, reason: "Requiere descartar 1 carta de la mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.hand && p.hand.length > 0) {
                const discarded = p.hand.shift();
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 29618570);
                if (selfSlot !== -1 && p.monsters[selfSlot]) {
                    p.monsters[selfSlot].canAttackTwice = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🦅 [Gray Wing] Descarta 1 carta para poder atacar 2 veces durante esta Battle Phase.`, 'monster');
                }
            }
            return { success: true };
        }
    },
    {
        id: 55013285,
        name: "Troop Dragon",
        type: "Effect Monster",
        atk: 700,
        def: 800,
        level: 2,
        race: "Dragon",
        attribute: "WIND",
        canActivate() { return { canActivate: false, reason: "Efecto disparado al destruirse en batalla." }; },
        async onDestroyedByBattle(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const dIdx = (p.deck || []).findIndex(c => Number(c.id || c.card_id) === 55013285);
            if (dIdx !== -1) {
                const dragon = p.deck.splice(dIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    dragon.position = 'face-up-defense';
                    p.monsters[emptySlot] = dragon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉🛡️ [Troop Dragon] ¡Destruido en batalla! Invoca de Modo Especial otro "Troop Dragon" desde el Deck.`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDestroyedByBattle({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 71829750,
        name: "Serpentine Princess",
        type: "Effect Monster",
        atk: 1400,
        def: 2000,
        level: 4,
        race: "Reptile",
        attribute: "WATER",
        canActivate() { return { canActivate: false, reason: "Efecto disparado al volver al Deck." }; },
        async onReturnedToDeck(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const monIdx = (p.deck || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 3);
            if (monIdx !== -1) {
                const mon = p.deck.splice(monIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    mon.position = 'face-up-attack';
                    p.monsters[emptySlot] = mon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐍👑 [Serpentine Princess] Al regresar al Deck, Invoca de Modo Especial a "${mon.name || mon.card_data?.name}" (Nv.${mon.level || mon.card_data?.level}) desde el Deck.`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 19153634,
        name: "Patrician of Darkness",
        type: "Effect Monster",
        atk: 2000,
        def: 1400,
        level: 5,
        race: "Zombie",
        attribute: "DARK",
        controlsOpponentAttackTargets: true,
        canActivate() { return { canActivate: false, reason: "Efecto continuo de batalla." }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 70797118,
        name: "Thunder Nyan Nyan",
        type: "Effect Monster",
        atk: 1900,
        def: 800,
        level: 4,
        race: "Thunder",
        attribute: "LIGHT",
        canActivate() { return { canActivate: false, reason: "Efecto continuo de autodestrucción." }; },
        async onCheckFieldPresence(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const hasNonLight = (p?.monsters || []).some(m => m && (m.attribute || m.card_data?.attribute || '').toUpperCase() !== 'LIGHT');
            if (hasNonLight && p?.monsters?.[slotIndex]) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[slotIndex], playerKey);
                p.monsters[slotIndex] = null;
                effectUtils.emitDuelLog(duelState.roomId, `⚡🐱 [Thunder Nyan Nyan] Se autodestruye al haber un monstruo que no es de LUZ en tu campo.`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 14291024,
        name: "Gradius' Option",
        type: "Effect Monster",
        atk: 0,
        def: 0,
        level: 1,
        race: "Machine",
        attribute: "LIGHT",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasGradius = (p?.monsters || []).some(m => m && Number(m.card_id || m.card_data?.id) === 10992251); // Gradius
            if (!hasGradius) return { canActivate: false, reason: "Debes controlar 1 \"Gradius\" boca arriba en tu campo." };
            return { canActivate: true };
        },
        async onSpecialSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const gradius = (p.monsters || []).find(m => m && Number(m.card_id || m.card_data?.id) === 10992251);
            if (gradius && p.monsters[slotIndex]) {
                const opt = p.monsters[slotIndex];
                opt.currentAtk = gradius.currentAtk !== undefined ? gradius.currentAtk : 1200;
                opt.currentDef = gradius.currentDef !== undefined ? gradius.currentDef : 800;
                effectUtils.emitDuelLog(duelState.roomId, `🚀✨ [Gradius' Option] Invocada Especialmente. Copia los stats de Gradius (ATK: ${opt.currentAtk} / DEF: ${opt.currentDef}).`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        }
    },
    {
        id: 6979239,
        name: "Woodland Sprite",
        type: "Effect Monster",
        atk: 900,
        def: 400,
        level: 3,
        race: "Plant",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasEquip = (p?.spells || []).some(s => s && (s.isEquip || s.race === 'Equip'));
            if (!hasEquip) return { canActivate: false, reason: "Requiere 1 Carta de Equipo en tu campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const sIdx = (p.spells || []).findIndex(s => s && (s.isEquip || s.race === 'Equip'));
            if (sIdx !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.spells[sIdx], playerKey);
                p.spells[sIdx] = null;
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🧚🌿 [Woodland Sprite] Envía una Carta de Equipo al Cementerio e inflige 500 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 18036057,
        name: "Airknight Parshath",
        type: "Effect Monster",
        atk: 1900,
        def: 1400,
        level: 5,
        race: "Fairy",
        attribute: "LIGHT",
        hasPiercing: true,
        canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },
        async onInflictBattleDamage(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.deck && p.deck.length > 0) {
                p.hand = p.hand || [];
                const drawn = p.deck.shift();
                p.hand.push(drawn);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️⚔️ [Airknight Parshath] ¡Infligió daño de combate (perforación)! Roba 1 carta del Deck ("${drawn.name || drawn.card_data?.name}").`, 'monster');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, effectUtils });
        }
    },
    {
        id: 43586926,
        name: "Twin-Headed Behemoth",
        type: "Effect Monster",
        atk: 1500,
        def: 1200,
        level: 3,
        race: "Dragon",
        attribute: "WIND",
        canActivate() { return { canActivate: false, reason: "Efecto de revivir en End Phase." }; },
        async onEndPhaseGY(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.pendingTwinHeadedBehemoth && !p.usedTwinHeadedBehemothDuel) {
                const gyIdx = (p.graveyard || []).findIndex(c => Number(c.id || c.card_id) === 43586926);
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (gyIdx !== -1 && emptySlot !== -1) {
                    const mon = p.graveyard.splice(gyIdx, 1)[0];
                    mon.position = 'face-up-defense';
                    mon.currentAtk = 1000;
                    mon.currentDef = 1000;
                    p.monsters[emptySlot] = mon;
                    p.pendingTwinHeadedBehemoth = false;
                    p.usedTwinHeadedBehemothDuel = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Twin-Headed Behemoth] ¡Revive en la End Phase con 1000 ATK / 1000 DEF! (1 vez por duelo).`, 'monster');
                }
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        }
    },
    {
        id: 79575620,
        name: "Injection Fairy Lily",
        type: "Effect Monster",
        atk: 400,
        def: 1500,
        level: 3,
        race: "Spellcaster",
        attribute: "EARTH",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 2000) return { canActivate: false, reason: "Se requieren más de 2000 LP para activar." };
            return { canActivate: true };
        },
        async onDamageStep(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 2000) {
                p.lifePoints -= 2000;
                const mon = p.monsters?.[slotIndex];
                if (mon) {
                    mon.currentAtk = (mon.currentAtk !== undefined ? mon.currentAtk : 400) + 3000;
                    effectUtils.emitDuelLog(duelState.roomId, `💉💖 [Injection Fairy Lily] ¡INYECCIÓN POTENCIADORA! Paga 2000 LP (LP: ${p.lifePoints}) y gana +3000 ATK durante el cálculo de daño (ATK: ${mon.currentAtk}).`, 'monster');
                }
                return { success: true };
            }
            return { success: false };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDamageStep({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        }
    }
];

function generateCode(card) {
    let extraFields = '';
    if (card.isFusion) extraFields += `    isFusion: true,\n`;
    if (card.fusionMaterials) extraFields += `    fusionMaterials: ${JSON.stringify(card.fusionMaterials)},\n`;
    if (card.isFlip) extraFields += `    isFlip: true,\n`;
    if (card.isSpirit) extraFields += `    isSpirit: true,\n`;
    if (card.cannotSpecialSummon) extraFields += `    cannotSpecialSummon: true,\n`;
    if (card.cannotSpecialSummonFromGY) extraFields += `    cannotSpecialSummonFromGY: true,\n`;
    if (card.canSpecialSummonSelf) extraFields += `    canSpecialSummonSelf: true,\n`;
    if (card.canAttackDirectly) extraFields += `    canAttackDirectly: true,\n`;
    if (card.canAttackAllMonsters) extraFields += `    canAttackAllMonsters: true,\n`;
    if (card.hasPiercing) extraFields += `    hasPiercing: true,\n`;
    if (card.immuneToSpellTargeting) extraFields += `    immuneToSpellTargeting: true,\n`;
    if (card.immuneToTrapTargeting) extraFields += `    immuneToTrapTargeting: true,\n`;
    if (card.negatesFlipEffects) extraFields += `    negatesFlipEffects: true,\n`;

    const methods = [];
    if (card.canActivate) methods.push(`    ${card.canActivate.toString()}`);
    if (card.onFlip) methods.push(`    ${card.onFlip.toString()}`);
    if (card.onNormalSummon) methods.push(`    ${card.onNormalSummon.toString()}`);
    if (card.onSpecialSummon) methods.push(`    ${card.onSpecialSummon.toString()}`);
    if (card.onSummonOrFlip) methods.push(`    ${card.onSummonOrFlip.toString()}`);
    if (card.onEndPhase) methods.push(`    ${card.onEndPhase.toString()}`);
    if (card.onEndPhaseGY) methods.push(`    ${card.onEndPhaseGY.toString()}`);
    if (card.onInflictBattleDamage) methods.push(`    ${card.onInflictBattleDamage.toString()}`);
    if (card.onMonsterDestroyedByBattle) methods.push(`    ${card.onMonsterDestroyedByBattle.toString()}`);
    if (card.onDestroyedByBattle) methods.push(`    ${card.onDestroyedByBattle.toString()}`);
    if (card.onDamageStep) methods.push(`    ${card.onDamageStep.toString()}`);
    if (card.onAfterAttack) methods.push(`    ${card.onAfterAttack.toString()}`);
    if (card.onReturnedToDeck) methods.push(`    ${card.onReturnedToDeck.toString()}`);
    if (card.onTributedForFiend) methods.push(`    ${card.onTributedForFiend.toString()}`);
    if (card.onFiendDestroyedMonsterByBattle) methods.push(`    ${card.onFiendDestroyedMonsterByBattle.toString()}`);
    if (card.onDrawPhaseReplace) methods.push(`    ${card.onDrawPhaseReplace.toString()}`);
    if (card.onNegateSpell) methods.push(`    ${card.onNegateSpell.toString()}`);
    if (card.onNegateTrap) methods.push(`    ${card.onNegateTrap.toString()}`);
    if (card.onCheckFieldPresence) methods.push(`    ${card.onCheckFieldPresence.toString()}`);
    if (card.onActivate) methods.push(`    ${card.onActivate.toString()}`);

    const methodsStr = methods.join(',\n\n');

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: LOD
 */
module.exports = {
    id: ${card.id},
    name: ${JSON.stringify(card.name)},
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

console.log(`Escribiendo ${cardsBatch2.length} cartas de Monstruos de LOD...`);
cardsBatch2.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [LOD] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 2 de LOD completado exitosamente.');
