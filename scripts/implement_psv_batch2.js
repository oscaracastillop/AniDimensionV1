/**
 * Script de implementación de alta fidelidad para Monstruos de PSV (21 cartas)
 * Expansión: Pharaoh's Servant (PSV)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch2 = [
    // -------------------------------------------------------------
    // FUSION MONSTER (1 carta)
    // -------------------------------------------------------------
    {
        id: 63519819,
        name: "Thousand-Eyes Restrict",
        type: "Fusion Effect Monster",
        atk: 0,
        def: 0,
        level: 1,
        race: "Spellcaster",
        attribute: "DARK",
        isFusion: true,
        fusionMaterials: [64631466, 27125110], // Relinquished (64631466) + Thousand-Eyes Idol (27125110)
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos para absorber." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m);
            const targetMon = opp.monsters?.[tSlot];

            if (!targetMon) return { success: false, reason: "Monstruo rival no encontrado." };

            opp.monsters[tSlot] = null;
            const stolenAtk = targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || targetMon.atk || 0);
            const stolenDef = targetMon.currentDef !== undefined ? targetMon.currentDef : (targetMon.card_data?.def || targetMon.def || 0);

            // Buscar este Thousand-Eyes Restrict en el campo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 63519819);
            if (selfSlot !== -1 && p.monsters[selfSlot]) {
                const self = p.monsters[selfSlot];
                self.equippedMonster = targetMon;
                self.currentAtk = stolenAtk;
                self.currentDef = stolenDef;
            }

            effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [Thousand-Eyes Restrict] ¡Absorbe a "${targetMon.card_data?.name || 'Monstruo'}"! Copia su ATK (${stolenAtk}) y DEF (${stolenDef}). Otros monstruos no pueden atacar ni cambiar su posición.`, 'monster');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // FLIP EFFECT MONSTERS (6 cartas)
    // -------------------------------------------------------------
    {
        id: 27911549,
        name: "Parasite Paracide",
        type: "Flip Effect Monster",
        atk: 500,
        def: 300,
        level: 2,
        race: "Insect",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp && opp.deck) {
                // Se baraja boca arriba en el Deck del oponente
                opp.deck.push({ id: 27911549, card_id: 27911549, name: "Parasite Paracide", faceUpInDeck: true });
                opp.deck.sort(() => Math.random() - 0.5);
                effectUtils.emitDuelLog(duelState.roomId, `🐛 [Parasite Paracide] ¡EFECTO DE VOLTEO! Se baraja boca arriba en el Deck de ${opp.username}. Al robarse infligirá 1000 de daño y convertirá sus monstruos en Insectos.`, 'flip');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 79106360,
        name: "Morphing Jar #2",
        type: "Flip Effect Monster",
        atk: 800,
        def: 700,
        level: 3,
        race: "Rock",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');

            [playerKey, oppKey].forEach(pKey => {
                const p = duelState[pKey];
                let returnedCount = 0;
                (p.monsters || []).forEach((m, idx) => {
                    if (m) {
                        p.deck.push(m);
                        p.monsters[idx] = null;
                        returnedCount++;
                    }
                });
                p.deck.sort(() => Math.random() - 0.5);
                // Reinvocar la misma cantidad
                for (let i = 0; i < returnedCount; i++) {
                    const monIdx = p.deck.findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
                    if (monIdx !== -1) {
                        const [summoned] = p.deck.splice(monIdx, 1);
                        summoned.position = 'DEF';
                        summoned.faceDown = true;
                        p.monsters[i] = summoned;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🏺🌀 [Morphing Jar #2] ¡EFECTO DE VOLTEO! Todos los monstruos regresan a los Decks y ambos jugadores excavan e invocan nuevos monstruos boca abajo.`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 6104968,
        name: "Bubonic Vermin",
        type: "Flip Effect Monster",
        atk: 900,
        def: 100,
        level: 3,
        race: "Beast",
        attribute: "EARTH",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const freeSlot = (p.monsters || []).findIndex(m => !m);
            const verminIdx = (p.deck || []).findIndex(c => Number(c.card_id || c.id) === 6104968);

            if (freeSlot !== -1 && verminIdx !== -1) {
                const [summoned] = p.deck.splice(verminIdx, 1);
                summoned.position = 'DEF';
                summoned.faceDown = true;
                p.monsters[freeSlot] = summoned;
                effectUtils.emitDuelLog(duelState.roomId, `🐀 [Bubonic Vermin] ¡EFECTO DE VOLTEO! Invoca de Modo Especial a "Bubonic Vermin" desde el Deck en Posición de Defensa boca abajo.`, 'flip');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 50122883,
        name: "Bite Shoes",
        type: "Flip Effect Monster",
        atk: 500,
        def: 300,
        level: 2,
        race: "Fiend",
        attribute: "DARK",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const faceUpMon = (opp?.monsters || []).find(m => m && !m.faceDown);
            if (faceUpMon) {
                faceUpMon.position = faceUpMon.position === 'ATK' ? 'DEF' : 'ATK';
                effectUtils.emitDuelLog(duelState.roomId, `👞🦷 [Bite Shoes] ¡EFECTO DE VOLTEO! Cambia la posición de batalla de "${faceUpMon.card_data?.name || 'Monstruo'}" a ${faceUpMon.position}.`, 'flip');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 57409948,
        name: "Bombardment Beetle",
        type: "Flip Effect Monster",
        atk: 400,
        def: 900,
        level: 2,
        race: "Insect",
        attribute: "WIND",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const faceDownMon = (opp?.monsters || []).find(m => m && m.faceDown);
            if (faceDownMon) {
                faceDownMon.faceDown = false;
                faceDownMon.position = 'DEF';
                effectUtils.emitDuelLog(duelState.roomId, `🪲💣 [Bombardment Beetle] ¡EFECTO DE VOLTEO! Voltea a "${faceDownMon.card_data?.name || 'Monstruo'}" a Posición de Defensa boca arriba (sin activar su efecto de volteo).`, 'flip');
            }
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },
    {
        id: 83994646,
        name: "4-Starred Ladybug of Doom",
        type: "Flip Effect Monster",
        atk: 800,
        def: 1200,
        level: 3,
        race: "Insect",
        attribute: "WIND",
        isFlip: true,
        canActivate() { return { canActivate: true }; },
        async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            let destroyedCount = 0;
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && (m.card_data?.level || m.level) === 4) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, oppKey);
                    destroyedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🐞💥 [4-Starred Ladybug of Doom] ¡EFECTO DE VOLTEO! Destruye ${destroyedCount} monstruo(s) boca arriba de Nivel 4 del oponente.`, 'flip');
            return { success: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        }
    },

    // -------------------------------------------------------------
    // EFFECT MONSTERS (14 cartas)
    // -------------------------------------------------------------
    {
        id: 77585513,
        name: "Jinzo",
        type: "Effect Monster",
        atk: 2400,
        def: 1500,
        level: 6,
        race: "Machine",
        attribute: "DARK",
        isTrapNegator: true,
        isJinzo: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.trapsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `🤖🚫 [Jinzo] ¡Efecto continuo activo! Las cartas de Trampa no pueden activarse y todos los efectos de Trampas en el campo quedan anulados.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 78193831,
        name: "Buster Blader",
        type: "Effect Monster",
        atk: 2600,
        def: 2300,
        level: 7,
        race: "Warrior",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            let dragonCount = 0;
            (opp?.monsters || []).forEach(m => {
                if (m) {
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    if (r.includes('dragon') || r.includes('dragón')) dragonCount++;
                }
            });
            (opp?.graveyard || []).forEach(c => {
                const r = (c.card_data?.race || c.race || '').toLowerCase();
                if (r.includes('dragon') || r.includes('dragón')) dragonCount++;
            });

            const bonus = dragonCount * 500;
            effectUtils.emitDuelLog(duelState.roomId, `⚔️🐉 [Buster Blader] ¡Cazador de Dragones! Gana +${bonus} ATK (${dragonCount} dragones en campo/cementerio rival). (ATK: ${2600 + bonus})`, 'monster');
            return { success: true, bonus };
        }
    },
    {
        id: 423705,
        name: "Gearfried the Iron Knight",
        type: "Effect Monster",
        atk: 1800,
        def: 1600,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        isGearfried: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [Gearfried the Iron Knight] ¡La armadura de hierro repele y destruye automáticamente cualquier carta de equipo vinculada a él!`, 'monster');
            return { success: true };
        }
    },
    {
        id: 66362965,
        name: "The Fiend Megacyber",
        type: "Effect Monster",
        atk: 2200,
        def: 1200,
        level: 6,
        race: "Warrior",
        attribute: "DARK",
        canSpecialSummonSelf: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const oppCount = (duelState[oppKey]?.monsters || []).filter(m => m).length;
            const myCount = (duelState[playerKey]?.monsters || []).filter(m => m).length;
            if (oppCount < myCount + 2) {
                return { canActivate: false, reason: "El rival debe controlar al menos 2 monstruos más que tú para la Invocación Especial." };
            }
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const freeSlot = (p.monsters || []).findIndex(m => !m);
            if (freeSlot === -1) return { success: false, reason: "Zona de monstruos llena." };

            const handIdx = (p.hand || []).findIndex(c => Number(c.card_id || c.id) === 66362965);
            if (handIdx !== -1) {
                const [card] = p.hand.splice(handIdx, 1);
                card.position = 'ATK';
                card.faceDown = false;
                p.monsters[freeSlot] = card;
                effectUtils.emitDuelLog(duelState.roomId, `🤖⚡ [The Fiend Megacyber] ¡Invocación Especial desde la mano! El rival controla 2 o más monstruos que tú.`, 'special_summon');
            }
            return { success: true };
        }
    },
    {
        id: 78658564,
        name: "Goblin Attack Force",
        type: "Effect Monster",
        atk: 2300,
        def: 0,
        level: 4,
        race: "Warrior",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👺⚔️ [Goblin Attack Force] ¡Fuerza de Ataque Goblin en combate! Cambiará a Posición de Defensa tras atacar y no podrá cambiar su posición hasta el final del próximo turno.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 21015833,
        name: "Hayabusa Knight",
        type: "Effect Monster",
        atk: 1000,
        def: 700,
        level: 3,
        race: "Warrior",
        attribute: "EARTH",
        canAttackTwice: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦅⚔️ [Hayabusa Knight] ¡Caballero Hayabusa puede realizar 2 ataques durante cada Battle Phase!`, 'monster');
            return { success: true };
        }
    },
    {
        id: 79870141,
        name: "Mad Sword Beast",
        type: "Effect Monster",
        atk: 1400,
        def: 1200,
        level: 4,
        race: "Dinosaur",
        attribute: "EARTH",
        hasPiercing: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦖⚔️ [Mad Sword Beast] ¡Furia de penetración! Inflige daño de batalla por penetración contra monstruos en Defensa.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 3643300,
        name: "The Legendary Fisherman",
        type: "Effect Monster",
        atk: 1850,
        def: 1600,
        level: 5,
        race: "Warrior",
        attribute: "WATER",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (hasUmi) {
                effectUtils.emitDuelLog(duelState.roomId, `🎣🌊 [The Legendary Fisherman] Con Umi en el campo, es inmune a Cartas Mágicas y no puede ser seleccionado como objetivo de ataque.`, 'monster');
            }
            return { success: true, immune: hasUmi };
        }
    },
    {
        id: 4266839,
        name: "Kiseitai",
        type: "Effect Monster",
        atk: 300,
        def: 800,
        level: 2,
        race: "Fiend",
        attribute: "WIND",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🪱🦠 [Kiseitai] Al ser atacado boca abajo se equipa al atacante. En cada Standby Phase del rival ganas LP iguales a la mitad de su ATK.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 51345461,
        name: "Sword Hunter",
        type: "Effect Monster",
        atk: 2450,
        def: 1700,
        level: 7,
        race: "Warrior",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🗡️🛡️ [Sword Hunter] Al final de la Battle Phase equipa a los monstruos que destruyó en combate, ganando +200 ATK por cada uno.`, 'monster');
            return { success: true };
        }
    },
    {
        id: 88733579,
        name: "Drill Bug",
        type: "Effect Monster",
        atk: 1100,
        def: 200,
        level: 2,
        race: "Insect",
        attribute: "EARTH",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const pIdx = (p.deck || []).findIndex(c => Number(c.card_id || c.id) === 27911549);
            if (pIdx !== -1) {
                const [card] = p.deck.splice(pIdx, 1);
                p.hand.push(card);
                effectUtils.emitDuelLog(duelState.roomId, `🪲🔩 [Drill Bug] ¡Añade 1 "Parasite Paracide" desde el Deck a la mano tras infligir daño de batalla!`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 24128274,
        name: "Deepsea Warrior",
        type: "Effect Monster",
        atk: 1600,
        def: 1800,
        level: 5,
        race: "Warrior",
        attribute: "WATER",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (hasUmi) {
                effectUtils.emitDuelLog(duelState.roomId, `🌊🛡️ [Deepsea Warrior] Con Umi en el campo, es completamente inmune a los efectos de Cartas Mágicas.`, 'monster');
            }
            return { success: true, immune: hasUmi };
        }
    },
    {
        id: 52675689,
        name: "Invitation to a Dark Sleep",
        type: "Effect Monster",
        atk: 1500,
        def: 1800,
        level: 5,
        race: "Spellcaster",
        attribute: "DARK",
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para dormir." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const target = (opp?.monsters || []).find(m => m && !m.faceDown);
            if (target) {
                target.cannotAttack = true;
                effectUtils.emitDuelLog(duelState.roomId, `💤🌙 [Invitation to a Dark Sleep] ¡Duerme a "${target.card_data?.name || 'Monstruo'}"! No puede declarar ataques mientras esta carta permanezca boca arriba.`, 'monster');
            }
            return { success: true };
        }
    },
    {
        id: 56387350,
        name: "Vampire Baby",
        type: "Effect Monster",
        atk: 700,
        def: 1000,
        level: 3,
        race: "Zombie",
        attribute: "DARK",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦇🩸 [Vampire Baby] Al final de la Battle Phase invoca de modo especial al monstruo que destruyó en combate.`, 'monster');
            return { success: true };
        }
    }
];

function generateCode(card) {
    let extraFields = '';
    if (card.isFusion) extraFields += `    isFusion: true,\n`;
    if (card.isFlip) extraFields += `    isFlip: true,\n`;
    if (card.isTrapNegator) extraFields += `    isTrapNegator: true,\n`;
    if (card.isJinzo) extraFields += `    isJinzo: true,\n`;
    if (card.isGearfried) extraFields += `    isGearfried: true,\n`;
    if (card.canAttackTwice) extraFields += `    canAttackTwice: true,\n`;
    if (card.hasPiercing) extraFields += `    hasPiercing: true,\n`;
    if (card.canSpecialSummonSelf) extraFields += `    canSpecialSummonSelf: true,\n`;
    if (card.fusionMaterials) extraFields += `    fusionMaterials: ${JSON.stringify(card.fusionMaterials)},\n`;

    const onFlipStr = card.onFlip ? `    ${card.onFlip.toString()},\n\n` : '';

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: PSV
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
    ${card.canActivate.toString()},

${onFlipStr}    ${card.onActivate.toString()},

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

console.log(`Escribiendo ${cardsBatch2.length} cartas de Monstruos de PSV...`);
cardsBatch2.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [PSV] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 2 de PSV completado exitosamente.');
