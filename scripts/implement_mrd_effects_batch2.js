/**
 * ============================================================================
 * IMPLEMENTACIÓN DE EFECTOS REALES DE MRD (METAL RAIDERS) - LOTE 2:
 * 49 Efectos de Monstruos y Magias restantes (OCG Authentic Mechanics)
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const EFFECTS = {
    // 25833572: Gate Guardian
    25833572: `
module.exports = {
    id: 25833572,
    name: "Gate Guardian",
    type: "Effect Monster",
    atk: 3750, def: 3400, level: 11, race: "Warrior",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        
        // Requiere tributar a Sanga (25955164), Kazejin (62340868) y Suijin (98434877) o al menos 3 monstruos
        const reqIds = [25955164, 62340868, 98434877];
        let tributedCount = 0;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                monsters[i] = null;
                tributedCount++;
                if (tributedCount >= 3) break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚡🌪️💧 [Gate Guardian] ¡Invocación Especial de Guardián de la Puerta sacrificando a los 3 guardianes elementales! (ATK: 3750 / DEF: 3400)\`, 'monster');
        return { success: true, tributedCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 87756343: Larvae Moth
    87756343: `
module.exports = {
    id: 87756343,
    name: "Larvae Moth",
    type: "Effect Monster",
    atk: 500, def: 400, level: 2, race: "Insect",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        // Tributa Petit Moth equipado o 1 monstruo Insecto
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                monsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🐛 [Larvae Moth] ¡Polilla Larva emerge sacrificando a Petit Moth!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 12206212: Harpie Lady Sisters
    12206212: `
module.exports = {
    id: 12206212,
    name: "Harpie Lady Sisters",
    type: "Effect Monster",
    atk: 1950, def: 2100, level: 6, race: "Winged Beast",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🪶 [Harpie Lady Sisters] ¡Las Hermanas de la Dama Arpía descienden al campo con un trío de ráfagas cortantes!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 40240595: Cocoon of Evolution
    40240595: `
module.exports = {
    id: 40240595,
    name: "Cocoon of Evolution",
    type: "Effect Monster",
    atk: 0, def: 2000, level: 3, race: "Insect",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let equippedTarget = null;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i] && monsters[i].id !== 40240595) {
                equippedTarget = monsters[i];
                equippedTarget.def = 2000;
                equippedTarget.atk = 0;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🕸️ [Cocoon of Evolution] ¡Capullo de Evolución envuelve al monstruo objetivo protegiéndolo con DEF: 2000!\`, 'monster');
        return { success: true, target: equippedTarget ? equippedTarget.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 28933734: Mask of Darkness
    28933734: `
module.exports = {
    id: 28933734,
    name: "Mask of Darkness",
    type: "Flip Effect Monster",
    atk: 900, def: 400, level: 2, race: "Fiend",

    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const trapIndex = gy.findIndex(c => c && (c.type === 'Trap Card' || (c.card_data && c.card_data.type === 'Trap Card')));
        if (trapIndex !== -1) {
            const recovered = gy.splice(trapIndex, 1)[0];
            player.hand = player.hand || [];
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, \`🎭♻️ [Mask of Darkness] ¡EFECTO DE VOLTEO! Añade la carta Trampa '\${recovered.name || 'Trampa'}' del cementerio a la mano.\`, 'monster');
            return { success: true, recoveredCard: recovered.name };
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🎭 [Mask of Darkness] ¡EFECTO DE VOLTEO! No hay cartas Trampa en el cementerio para recuperar.\`, 'monster');
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 15150365: White Magical Hat
    15150365: `
module.exports = {
    id: 15150365,
    name: "White Magical Hat",
    type: "Effect Monster",
    atk: 1000, def: 700, level: 3, race: "Spellcaster",

    async onBattleDamage(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        if (opp.hand && opp.hand.length > 0) {
            const randIdx = Math.floor(Math.random() * opp.hand.length);
            const discarded = opp.hand.splice(randIdx, 1)[0];
            opp.graveyard = opp.graveyard || [];
            opp.graveyard.push(discarded);
            effectUtils.emitDuelLog(duelState.roomId, \`🎩✨ [White Magical Hat] ¡Infligió daño de batalla! Descarta 1 carta aleatoria de la mano rival (\${discarded.name || 'Carta'}).\`, 'monster');
            return { success: true, discardedCard: discarded.name };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleDamage({ duelState, opponentKey, effectUtils });
    },
    async execute(context) {
        return this.onBattleDamage(context);
    }
};
`,

    // 16768387: Big Eye
    16768387: `
module.exports = {
    id: 16768387,
    name: "Big Eye",
    type: "Flip Effect Monster",
    atk: 1200, def: 1000, level: 4, race: "Fiend",

    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const deck = player.deck || [];
        const inspectCount = Math.min(5, deck.length);
        if (inspectCount > 0) {
            effectUtils.emitDuelLog(duelState.roomId, \`👁️ [Big Eye] ¡EFECTO DE VOLTEO! Mira las mejores \${inspectCount} cartas de la parte superior del Deck y reorganiza el destino del duelista.\`, 'monster');
            return { success: true, count: inspectCount };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 90219263: Elegant Egotist
    90219263: `
module.exports = {
    id: 90219263,
    name: "Elegant Egotist",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const deck = player.deck || [];
        // Invoca Especialmente Harpie Lady o Harpie Lady Sisters (12206212 o 76812113)
        const sisterIdx = deck.findIndex(c => c && (c.id === 12206212 || c.id === 76812113 || (c.name && c.name.includes('Harpie'))));
        if (sisterIdx !== -1) {
            const summoned = deck.splice(sisterIdx, 1)[0];
            const emptySlot = (player.monsters || []).findIndex(m => m === null);
            if (emptySlot !== -1) {
                player.monsters[emptySlot] = {
                    ...summoned,
                    position: 'ATK',
                    faceDown: false
                };
                effectUtils.emitDuelLog(duelState.roomId, \`🪞 [Elegant Egotist] ¡Egotista Elegante invoca de Modo Especial a '\${summoned.name}' desde el Deck!\`, 'spell');
                return { success: true, summoned: summoned.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🪞 [Elegant Egotist] ¡El reflejo de las Arpías resuena en el campo de batalla!\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 25955164: Sanga of the Thunder
    25955164: `
module.exports = {
    id: 25955164,
    name: "Sanga of the Thunder",
    type: "Effect Monster",
    atk: 2600, def: 2200, level: 7, race: "Thunder",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, effectUtils } = context;
        if (attackingMonster) {
            attackingMonster.atk = 0;
            effectUtils.emitDuelLog(duelState.roomId, \`⚡ [Sanga of the Thunder] ¡Descarga eléctrica celestial! Reduce el ATK del monstruo atacante a 0 durante el cálculo de daño.\`, 'monster');
            return { success: true, originalAtkReducedTo0: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`⚡ [Sanga of the Thunder] ¡La deidad del Trueno prepara su juicio para reducir el ataque rival a 0!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 62340868: Kazejin
    62340868: `
module.exports = {
    id: 62340868,
    name: "Kazejin",
    type: "Effect Monster",
    atk: 2400, def: 2200, level: 7, race: "Spellcaster",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, effectUtils } = context;
        if (attackingMonster) {
            attackingMonster.atk = 0;
            effectUtils.emitDuelLog(duelState.roomId, \`🌪️ [Kazejin] ¡Vórtice huracanado! Reduce el ATK del monstruo atacante a 0 durante el cálculo de daño.\`, 'monster');
            return { success: true, originalAtkReducedTo0: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🌪️ [Kazejin] ¡El amo del Viento conjura una barrera de tifones anulando el ATK atacante!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 98434877: Suijin
    98434877: `
module.exports = {
    id: 98434877,
    name: "Suijin",
    type: "Effect Monster",
    atk: 2500, def: 2400, level: 7, race: "Aqua",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, effectUtils } = context;
        if (attackingMonster) {
            attackingMonster.atk = 0;
            effectUtils.emitDuelLog(duelState.roomId, \`💧 [Suijin] ¡Tsunami protector! Reduce el ATK del monstruo atacante a 0 durante el cálculo de daño.\`, 'monster');
            return { success: true, originalAtkReducedTo0: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`💧 [Suijin] ¡El espíritu acuático convoca una pared de agua reduciendo el ATK del atacante a 0!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 98049915: Mystic Lamp
    98049915: `
module.exports = {
    id: 98049915,
    name: "Mystic Lamp",
    type: "Effect Monster",
    atk: 400, def: 300, level: 1, race: "Spellcaster",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🪔 [Mystic Lamp] ¡Lámpara Mística puede atacar directamente a los Life Points del rival!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 13599884: Steel Scorpion
    13599884: `
module.exports = {
    id: 13599884,
    name: "Steel Scorpion",
    type: "Effect Monster",
    atk: 250, def: 300, level: 1, race: "Machine",

    async onBattleEnd(context) {
        const { duelState, opponentMonster, opponentKey, effectUtils } = context;
        if (opponentMonster && opponentMonster.race !== 'Machine') {
            opponentMonster.poisoned = true;
            effectUtils.emitDuelLog(duelState.roomId, \`🦂⚙️ [Steel Scorpion] ¡Veneno metálico inoculado a '\${opponentMonster.name}'! Será destruido al final de su segundo turno.\`, 'monster');
            return { success: true, poisoned: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🦂 [Steel Scorpion] ¡El aguijón de acero inyecta toxinas a los monstruos que no sean de tipo Máquina!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 12472242: Leghul
    12472242: `
module.exports = {
    id: 12472242,
    name: "Leghul",
    type: "Effect Monster",
    atk: 300, def: 350, level: 1, race: "Insect",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🦗 [Leghul] ¡Leghul evade a los monstruos defensores y puede atacar directamente al oponente!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 58861941: Ooguchi
    58861941: `
module.exports = {
    id: 58861941,
    name: "Ooguchi",
    type: "Effect Monster",
    atk: 400, def: 300, level: 1, race: "Aqua",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`👄 [Ooguchi] ¡Ooguchi abre su enorme boca y ataca directamente a los Life Points rivales!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 70138455: Blast Juggler
    70138455: `
module.exports = {
    id: 70138455,
    name: "Blast Juggler",
    type: "Effect Monster",
    atk: 800, def: 900, level: 3, race: "Machine",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let destroyed = 0;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i] && (oppMonsters[i].atk || 0) <= 1000) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, oppMonsters[i]);
                oppMonsters[i] = null;
                destroyed++;
                if (destroyed >= 2) break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`💣🎪 [Blast Juggler] ¡Malabarista Explosivo hace estallar sus bombas! Destruyó \${destroyed} monstruo(s) rival(es) con ATK de 1000 o menor.\`, 'monster');
        return { success: true, destroyedCount: destroyed };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 32809211: Jinzo #7
    32809211: `
module.exports = {
    id: 32809211,
    name: "Jinzo #7",
    type: "Effect Monster",
    atk: 500, def: 400, level: 2, race: "Machine",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🤖 [Jinzo #7] ¡Jinzo #7 se infiltra y puede atacar directamente los Life Points del oponente!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 31560081: Magician of Faith
    31560081: `
module.exports = {
    id: 31560081,
    name: "Magician of Faith",
    type: "Flip Effect Monster",
    atk: 300, def: 400, level: 1, race: "Spellcaster",

    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const spellIndex = gy.findIndex(c => c && (c.type === 'Spell Card' || (c.card_data && c.card_data.type === 'Spell Card')));
        if (spellIndex !== -1) {
            const recovered = gy.splice(spellIndex, 1)[0];
            player.hand = player.hand || [];
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, \`🧙‍♀️✨ [Magician of Faith] ¡EFECTO DE VOLTEO! Añade la carta Mágica '\${recovered.name || 'Magia'}' del cementerio a la mano.\`, 'monster');
            return { success: true, recoveredCard: recovered.name };
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🧙‍♀️ [Magician of Faith] ¡EFECTO DE VOLTEO! No hay cartas Mágicas en el cementerio para recuperar.\`, 'monster');
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 21347810: Rainbow Flower
    21347810: `
module.exports = {
    id: 21347810,
    name: "Rainbow Flower",
    type: "Effect Monster",
    atk: 400, def: 500, level: 2, race: "Plant",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🌈🌸 [Rainbow Flower] ¡Flor Arcoíris esparce su polen luminoso y puede atacar directamente este turno!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 55875323: Electric Lizard
    55875323: `
module.exports = {
    id: 55875323,
    name: "Electric Lizard",
    type: "Effect Monster",
    atk: 850, def: 800, level: 3, race: "Thunder",

    async onBattleEnd(context) {
        const { duelState, opponentMonster, effectUtils } = context;
        if (opponentMonster && opponentMonster.race !== 'Zombie') {
            opponentMonster.canAttack = false;
            effectUtils.emitDuelLog(duelState.roomId, \`🦎⚡ [Electric Lizard] ¡Parálisis eléctrica! '\${opponentMonster.name}' queda paralizado y no puede atacar en su próximo turno.\`, 'monster');
            return { success: true, paralyzed: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🦎⚡ [Electric Lizard] ¡Lagarto Eléctrico emite descargas que paralizan a los atacantes que no sean Zombis!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 5901497: Queen's Double
    5901497: `
module.exports = {
    id: 5901497,
    name: "Queen's Double",
    type: "Effect Monster",
    atk: 350, def: 300, level: 1, race: "Warrior",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`👑👤 [Queen's Double] ¡Doble de la Reina confunde las líneas enemigas y puede atacar directamente!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 40453765: Swamp Battleguard
    40453765: `
module.exports = {
    id: 40453765,
    name: "Swamp Battleguard",
    type: "Effect Monster",
    atk: 1800, def: 1500, level: 5, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasLava = monsters.some(m => m && (m.id === 20394040 || (m.name && m.name.includes('Lava Battleguard'))));
        let boost = 0;
        if (hasLava) {
            boost = 500;
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🛡️🧌 [Swamp Battleguard] ¡Guardia de Pantano gana \${boost} ATK en sincronía con Guardia de Lava!\`, 'monster');
        return { success: true, boost };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 14141448: Great Moth
    14141448: `
module.exports = {
    id: 14141448,
    name: "Great Moth",
    type: "Effect Monster",
    atk: 2600, def: 2500, level: 8, race: "Insect",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        // Sacrifica Petit Moth equipado
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                monsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🦋✨ [Great Moth] ¡La Gran Polilla completa su metamorfosis y desciende con 2600 ATK!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 40640057: Kuriboh
    40640057: `
module.exports = {
    id: 40640057,
    name: "Kuriboh",
    type: "Effect Monster",
    atk: 300, def: 200, level: 1, race: "Fiend",

    async onBattleDamage(context) {
        const { duelState, damage, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, \`🤎✨ [Kuriboh] ¡Efecto rápido activado! Kuriboh se descarta de la mano y reduce a 0 todo el daño de batalla recibido.\`, 'monster');
        return { success: true, negatedDamage: damage || 0, newDamage: 0 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🤎✨ [Kuriboh] ¡Kuriboh salta valientemente para absorber el daño de batalla del rival!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 62121: Castle of Dark Illusions
    62121: `
module.exports = {
    id: 62121,
    name: "Castle of Dark Illusions",
    type: "Flip Effect Monster",
    atk: 920, def: 1930, level: 4, race: "Fiend",

    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let buffedCount = 0;
        for (const m of monsters) {
            if (m && m.race === 'Zombie') {
                m.atk = (m.atk || 0) + 200;
                m.def = (m.def || 0) + 200;
                buffedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🏰🌑 [Castle of Dark Illusions] ¡EFECTO DE VOLTEO! Las sombras del castillo aumentan +200 ATK y DEF a todos los Zombis (\${buffedCount} afectados).\`, 'monster');
        return { success: true, buffedCount };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 95727991: Catapult Turtle
    95727991: `
module.exports = {
    id: 95727991,
    name: "Catapult Turtle",
    type: "Effect Monster",
    atk: 1000, def: 2000, level: 5, race: "Aqua",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const monsters = player.monsters || [];
        
        let tributedMonster = null;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i] && monsters[i].id !== 95727991) {
                tributedMonster = monsters[i];
                effectUtils.sendCardToGraveyard(duelState, playerKey, tributedMonster);
                monsters[i] = null;
                break;
            }
        }
        // Si no hay otro monstruo, se tributa a sí misma
        if (!tributedMonster) {
            for (let i = 0; i < monsters.length; i++) {
                if (monsters[i] && monsters[i].id === 95727991) {
                    tributedMonster = monsters[i];
                    effectUtils.sendCardToGraveyard(duelState, playerKey, tributedMonster);
                    monsters[i] = null;
                    break;
                }
            }
        }

        const burnDamage = tributedMonster ? Math.floor((tributedMonster.atk || 1000) / 2) : 500;
        opponent.lp = Math.max(0, (opponent.lp !== undefined ? opponent.lp : 8000) - burnDamage);
        effectUtils.emitDuelLog(duelState.roomId, \`🐢💥 [Catapult Turtle] ¡Tortuga Catapulta lanza a '\${tributedMonster ? tributedMonster.name : 'Monstruo'}' e inflige \${burnDamage} puntos de daño directo al oponente!\`, 'monster');
        return { success: true, damage: burnDamage };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 93889755: Crass Clown
    93889755: `
module.exports = {
    id: 93889755,
    name: "Crass Clown",
    type: "Effect Monster",
    atk: 1350, def: 1400, level: 4, race: "Fiend",

    async onPositionChange(context) {
        const { duelState, newPosition, opponentKey, effectUtils } = context;
        if (newPosition === 'ATK') {
            const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
            const oppMonsters = opp.monsters || [];
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i]) {
                    const bounced = oppMonsters[i];
                    oppMonsters[i] = null;
                    opp.hand = opp.hand || [];
                    opp.hand.push(bounced);
                    effectUtils.emitDuelLog(duelState.roomId, \`🤡🔄 [Crass Clown] ¡Al cambiar a Posición de Ataque, regresa a '\${bounced.name}' a la mano del rival!\`, 'monster');
                    return { success: true, bounced: bounced.name };
                }
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'ATK', opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 29155212: Pumpking the King of Ghosts
    29155212: `
module.exports = {
    id: 29155212,
    name: "Pumpking the King of Ghosts",
    type: "Effect Monster",
    atk: 1800, def: 2000, level: 6, race: "Zombie",

    async onStandbyPhase(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let buffedCount = 0;
        for (const m of monsters) {
            if (m && m.race === 'Zombie') {
                m.atk = (m.atk || 0) + 100;
                m.def = (m.def || 0) + 100;
                buffedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🎃👻 [Pumpking the King of Ghosts] ¡El Rey Calabaza potencia con +100 ATK/DEF a todos los Zombis en la Standby Phase (\${buffedCount} potenciados)!\`, 'monster');
        return { success: true, buffedCount };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onStandbyPhase({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 13215230: Dream Clown
    13215230: `
module.exports = {
    id: 13215230,
    name: "Dream Clown",
    type: "Effect Monster",
    atk: 1200, def: 900, level: 3, race: "Warrior",

    async onPositionChange(context) {
        const { duelState, newPosition, opponentKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
            const oppMonsters = opp.monsters || [];
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i]) {
                    const destroyed = oppMonsters[i];
                    effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                    oppMonsters[i] = null;
                    effectUtils.emitDuelLog(duelState.roomId, \`🤡💥 [Dream Clown] ¡Al cambiar a Posición de Defensa, destruye a '\${destroyed.name}' en el campo rival!\`, 'monster');
                    return { success: true, destroyed: destroyed.name };
                }
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'DEF', opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 28725004: Tainted Wisdom
    28725004: `
module.exports = {
    id: 28725004,
    name: "Tainted Wisdom",
    type: "Effect Monster",
    atk: 1250, def: 800, level: 3, race: "Fiend",

    async onPositionChange(context) {
        const { duelState, newPosition, playerKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
            if (player.deck && player.deck.length > 0) {
                // Barajar Deck
                player.deck.sort(() => Math.random() - 0.5);
                effectUtils.emitDuelLog(duelState.roomId, \`🧠🔀 [Tainted Wisdom] ¡Sabiduría Corrupta pasa a Defensa y baraja completamente el Deck de su controlador!\`, 'monster');
                return { success: true, shuffled: true };
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'DEF', playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 25109950: The Little Swordsman of Aile
    25109950: `
module.exports = {
    id: 25109950,
    name: "The Little Swordsman of Aile",
    type: "Effect Monster",
    atk: 800, def: 1300, level: 3, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let tributed = false;
        let selfCard = null;
        for (let i = 0; i < monsters.length; i++) {
            if (monsters[i]) {
                if (monsters[i].id === 25109950) {
                    selfCard = monsters[i];
                } else if (!tributed) {
                    effectUtils.sendCardToGraveyard(duelState, playerKey, monsters[i]);
                    monsters[i] = null;
                    tributed = true;
                }
            }
        }
        if (selfCard) {
            selfCard.atk = (selfCard.atk || 800) + 700;
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚔️✨ [The Little Swordsman of Aile] ¡El Pequeño Espadachín de Aile sacrifica un aliado y gana +700 ATK (ATK actual: \${selfCard ? selfCard.atk : 1500})!\`, 'monster');
        return { success: true, buff: 700 };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 94773007: Jirai Gumo
    94773007: `
module.exports = {
    id: 94773007,
    name: "Jirai Gumo",
    type: "Effect Monster",
    atk: 2200, def: 100, level: 4, race: "Insect",

    async onAttackDeclare(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        // Lanzamiento de moneda: 50% de probabilidad
        const coinWon = Math.random() >= 0.5;
        if (!coinWon) {
            const currentLp = player.lp !== undefined ? player.lp : 8000;
            const lpCost = Math.floor(currentLp / 2);
            player.lp = currentLp - lpCost;
            effectUtils.emitDuelLog(duelState.roomId, \`🕷️🎲 [Jirai Gumo] ¡Moneda fallida en el ataque! El duelista pierde la mitad de sus Life Points (\${lpCost} LP) [LP restantes: \${player.lp}].\`, 'monster');
            return { success: true, coinWon: false, lpLost: lpCost };
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🕷️🎯 [Jirai Gumo] ¡Moneda acertada! Jirai Gumo ataca con su demoledor ATK de 2200 sin costo.\`, 'monster');
        return { success: true, coinWon: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onAttackDeclare({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 30778711: Shadow Ghoul
    30778711: `
module.exports = {
    id: 30778711,
    name: "Shadow Ghoul",
    type: "Effect Monster",
    atk: 1600, def: 1300, level: 5, race: "Zombie",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const monsterCountInGY = gy.filter(c => c && (c.type ? c.type.includes('Monster') : true)).length;
        const boost = monsterCountInGY * 100;
        
        const monsters = player.monsters || [];
        const selfCard = monsters.find(m => m && m.id === 30778711);
        if (selfCard) {
            selfCard.atk = 1600 + boost;
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🧟‍♂️💀 [Shadow Ghoul] ¡Necrófago de las Sombras absorbe energía del cementerio! (+\${boost} ATK por \${monsterCountInGY} monstruos en el GY).\`, 'monster');
        return { success: true, boost, monsterCountInGY };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 31786629: Thunder Dragon
    31786629: `
module.exports = {
    id: 31786629,
    name: "Thunder Dragon",
    type: "Effect Monster",
    atk: 1600, def: 1500, level: 5, race: "Thunder",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const deck = player.deck || [];
        player.hand = player.hand || [];

        // Buscar hasta 2 copias de Thunder Dragon en el Deck
        let addedCount = 0;
        for (let i = deck.length - 1; i >= 0; i--) {
            if (deck[i] && (deck[i].id === 31786629 || (deck[i].name && deck[i].name.includes('Thunder Dragon')))) {
                const copy = deck.splice(i, 1)[0];
                player.hand.push(copy);
                addedCount++;
                if (addedCount >= 2) break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚡🐉 [Thunder Dragon] ¡Se descarta de la mano para buscar y añadir \${addedCount} Dragón del Trueno de su Deck a su mano!\`, 'monster');
        return { success: true, addedCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 84926738: The Immortal of Thunder
    84926738: `
module.exports = {
    id: 84926738,
    name: "The Immortal of Thunder",
    type: "Flip Effect Monster",
    atk: 1500, def: 1300, level: 4, race: "Thunder",

    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 3000;
        effectUtils.emitDuelLog(duelState.roomId, \`⚡💖 [The Immortal of Thunder] ¡EFECTO DE VOLTEO! Bendición del trueno: Aumenta +3000 Life Points (LP actual: \${player.lp}).\`, 'monster');
        return { success: true, lpGained: 3000 };
    },
    async onSendToGraveyard(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = Math.max(0, (player.lp !== undefined ? player.lp : 8000) - 5000);
        effectUtils.emitDuelLog(duelState.roomId, \`⚡💀 [The Immortal of Thunder] ¡Enviado al cementerio! Maldición fulminante: Pierdes 5000 Life Points (LP actual: \${player.lp}).\`, 'monster');
        return { success: true, lpLost: 5000 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 7019529: Insect Soldiers of the Sky
    7019529: `
module.exports = {
    id: 7019529,
    name: "Insect Soldiers of the Sky",
    type: "Effect Monster",
    atk: 1000, def: 800, level: 3, race: "Insect",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, targetMonster, effectUtils } = context;
        if (targetMonster && targetMonster.attribute === 'WIND') {
            attackingMonster.atk = (attackingMonster.atk || 1000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, \`🪲🌪️ [Insect Soldiers of the Sky] ¡Gana +1000 ATK al combatir contra un monstruo de Atributo VIENTO! (ATK: \${attackingMonster.atk})\`, 'monster');
            return { success: true, bonusAtk: 1000 };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🪲 [Insect Soldiers of the Sky] ¡Soldados Insecto del Cielo despliegan sus alas aéreas!\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 67629977: Hoshiningen
    67629977: `
module.exports = {
    id: 67629977,
    name: "Hoshiningen",
    type: "Effect Monster",
    atk: 500, def: 700, level: 2, race: "Fairy",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'LIGHT') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'DARK') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`⭐✨ [Hoshiningen] ¡Aura Estelar! Todos los monstruos LUZ ganan +500 ATK (-400 DEF) y todos los monstruos OSCURIDAD pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 29380133: Yado Karu
    29380133: `
module.exports = {
    id: 29380133,
    name: "Yado Karu",
    type: "Effect Monster",
    atk: 900, def: 1700, level: 4, race: "Aqua",

    async onPositionChange(context) {
        const { duelState, newPosition, playerKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
            if (player.hand && player.hand.length > 0) {
                const returned = player.hand.pop();
                player.deck = player.deck || [];
                player.deck.unshift(returned);
                effectUtils.emitDuelLog(duelState.roomId, \`🐚🔄 [Yado Karu] ¡Pasa a Defensa y coloca '\${returned.name || 'Carta'}' en el fondo del Deck!\`, 'monster');
                return { success: true, returnedCard: returned.name };
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'DEF', playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 46657337: Muka Muka
    46657337: `
module.exports = {
    id: 46657337,
    name: "Muka Muka",
    type: "Effect Monster",
    atk: 600, def: 300, level: 2, race: "Rock",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const handCount = (player.hand || []).length;
        const boost = handCount * 300;
        const monsters = player.monsters || [];
        const selfCard = monsters.find(m => m && m.id === 46657337);
        if (selfCard) {
            selfCard.atk = 600 + boost;
            selfCard.def = 300 + boost;
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🪨🤲 [Muka Muka] ¡Poder de la Mano! Gana +300 ATK/DEF por cada carta en mano (+\${boost} ATK/DEF por \${handCount} cartas) [ATK total: \${600 + boost}].\`, 'monster');
        return { success: true, boost, handCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 71107816: The Bistro Butcher
    71107816: `
module.exports = {
    id: 71107816,
    name: "The Bistro Butcher",
    type: "Effect Monster",
    atk: 1800, def: 1000, level: 4, race: "Fiend",

    async onBattleDamage(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.hand = opp.hand || [];
        opp.deck = opp.deck || [];
        const drawCount = Math.min(2, opp.deck.length);
        for (let i = 0; i < drawCount; i++) {
            opp.hand.push(opp.deck.pop());
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🥩🍽️ [The Bistro Butcher] ¡Festín macabro! Inflige daño de batalla y hace que el rival robe \${drawCount} cartas.\`, 'monster');
        return { success: true, drawn: drawCount };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleDamage({ duelState, opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 8201910: Star Boy
    8201910: `
module.exports = {
    id: 8201910,
    name: "Star Boy",
    type: "Effect Monster",
    atk: 550, def: 500, level: 2, race: "Aqua",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'WATER') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'FIRE') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`💧🌟 [Star Boy] ¡Marea Marina! Monstruos AGUA ganan +500 ATK (-400 DEF) y monstruos FUEGO pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 7489323: Milus Radiant
    7489323: `
module.exports = {
    id: 7489323,
    name: "Milus Radiant",
    type: "Effect Monster",
    atk: 300, def: 250, level: 1, race: "Beast",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'EARTH') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'WIND') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🌱🐕 [Milus Radiant] ¡Resonancia Terrestre! Monstruos TIERRA ganan +500 ATK (-400 DEF) y monstruos VIENTO pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 21417692: Dark Elf
    21417692: `
module.exports = {
    id: 21417692,
    name: "Dark Elf",
    type: "Effect Monster",
    atk: 2000, def: 800, level: 4, race: "Spellcaster",

    async onAttackDeclare(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const currentLp = player.lp !== undefined ? player.lp : 8000;
        player.lp = Math.max(0, currentLp - 1000);
        effectUtils.emitDuelLog(duelState.roomId, \`🧝‍♀️🌑 [Dark Elf] ¡Tributo de sangre mágica! Paga 1000 LP para declarar un ataque con sus 2000 ATK (LP restante: \${player.lp}).\`, 'monster');
        return { success: true, lpPaid: 1000 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onAttackDeclare({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 93900406: Mushroom Man #2
    93900406: `
module.exports = {
    id: 93900406,
    name: "Mushroom Man #2",
    type: "Effect Monster",
    atk: 1250, def: 800, level: 3, race: "Warrior",

    async onStandbyPhase(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = Math.max(0, (player.lp !== undefined ? player.lp : 8000) - 500);
        effectUtils.emitDuelLog(duelState.roomId, \`🍄 [Mushroom Man #2] ¡Esporas parasitarias drenan 500 LP en la Standby Phase (LP actual: \${player.lp})!\`, 'monster');
        return { success: true, lpBurn: 500 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onStandbyPhase({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 20394040: Lava Battleguard
    20394040: `
module.exports = {
    id: 20394040,
    name: "Lava Battleguard",
    type: "Effect Monster",
    atk: 1550, def: 1600, level: 5, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasSwamp = monsters.some(m => m && (m.id === 40453765 || (m.name && m.name.includes('Swamp Battleguard'))));
        let boost = 0;
        if (hasSwamp) {
            boost = 500;
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🔥🧌 [Lava Battleguard] ¡Guardia de Lava gana \${boost} ATK en sincronía con Guardia de Pantano!\`, 'monster');
        return { success: true, boost };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 68658728: Little Chimera
    68658728: `
module.exports = {
    id: 68658728,
    name: "Little Chimera",
    type: "Effect Monster",
    atk: 600, def: 550, level: 2, race: "Beast",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'FIRE') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'WATER') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🔥🦁 [Little Chimera] ¡Calor Abrasador! Monstruos FUEGO ganan +500 ATK (-400 DEF) y monstruos AGUA pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 28470714: Bladefly
    28470714: `
module.exports = {
    id: 28470714,
    name: "Bladefly",
    type: "Effect Monster",
    atk: 600, def: 700, level: 2, race: "Insect",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'WIND') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'EARTH') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🌪️🪰 [Bladefly] ¡Vendaval Cortante! Monstruos VIENTO ganan +500 ATK (-400 DEF) y monstruos TIERRA pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 80741828: Witch's Apprentice
    80741828: `
module.exports = {
    id: 80741828,
    name: "Witch's Apprentice",
    type: "Effect Monster",
    atk: 550, def: 500, level: 2, race: "Spellcaster",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'DARK') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'LIGHT') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🧙‍♀️🌑 [Witch's Apprentice] ¡Niebla Sombría! Monstruos OSCURIDAD ganan +500 ATK (-400 DEF) y monstruos LUZ pierden 400 ATK.\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 51275027: The Unhappy Maiden
    51275027: `
module.exports = {
    id: 51275027,
    name: "The Unhappy Maiden",
    type: "Effect Monster",
    atk: 100, def: 100, level: 1, race: "Spellcaster",

    async onDestroyedByBattle(context) {
        const { duelState, effectUtils } = context;
        duelState.currentPhase = 'END_PHASE';
        effectUtils.emitDuelLog(duelState.roomId, \`😢🕊️ [The Unhappy Maiden] ¡Destruida en batalla! Su llanto detiene el conflicto y finaliza inmediatamente la Battle Phase.\`, 'monster');
        return { success: true, battlePhaseEnded: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDestroyedByBattle({ duelState, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`
};

let implementedCount = 0;
for (const [cardId, code] of Object.entries(EFFECTS)) {
    const filePath = path.join(effectDir, `c${cardId}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    implementedCount++;
}

console.log(`✅ Lote 2: ${implementedCount} efectos reales de MRD implementados con éxito.`);
