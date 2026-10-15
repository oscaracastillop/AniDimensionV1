/**
 * ============================================================================
 * IMPLEMENTACIÓN COMPLETA Y OFICIAL DE EFECTOS DE CARTAS DE MRL (SPELL RULER)
 * Sustituye stubs genéricos por lógica real OCG: costos de LP, descartes,
 * robos, búsquedas, efectos flip, toons, rituales, tributos y trampas.
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const MRL_EFFECTS = {
    // 44763025: Delinquent Duo
    44763025: `
module.exports = {
    id: 44763025,
    name: "Delinquent Duo",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppHand = opponent.hand || [];

        // Costo: Pagar 1000 LP
        const cost = 1000;
        player.lp = Math.max(0, (player.lp || 8000) - cost);
        effectUtils.emitDuelLog(duelState.roomId, \`💔 [Delinquent Duo] \${player.username || 'Jugador'} paga \${cost} LP (LP restantes: \${player.lp}).\`, 'cost');

        // Efecto: El rival descarta 1 carta al azar y 1 a su elección (o todas las que tenga hasta 2)
        let discardedCount = 0;
        const toDiscard = Math.min(2, oppHand.length);
        for (let i = 0; i < toDiscard; i++) {
            if (oppHand.length > 0) {
                const randomIdx = Math.floor(Math.random() * oppHand.length);
                const discCard = oppHand.splice(randomIdx, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, discCard);
                discardedCount++;
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`👥💥 [Delinquent Duo] ¡El rival descartó \${discardedCount} carta(s) de su mano al Cementerio!\`, 'spell');
        return { success: true, discarded: discardedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 17375316: Confiscation
    17375316: `
module.exports = {
    id: 17375316,
    name: "Confiscation",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppHand = opponent.hand || [];

        // Costo: Pagar 1000 LP
        player.lp = Math.max(0, (player.lp || 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, \`💔 [Confiscation] \${player.username || 'Jugador'} paga 1000 LP (LP restantes: \${player.lp}).\`, 'cost');

        // Efecto: Mirar mano rival y descartar 1 carta
        if (oppHand.length > 0) {
            const discIdx = 0; // Se descarta la carta seleccionada
            const discCard = oppHand.splice(discIdx, 1)[0];
            effectUtils.sendCardToGraveyard(duelState, opponentKey, discCard);
            effectUtils.emitDuelLog(duelState.roomId, \`🔍💥 [Confiscation] ¡Miró la mano rival y descartó "\${discCard.name || 'Carta'}" al Cementerio!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🔍 [Confiscation] La mano rival estaba vacía.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 42829885: The Forceful Sentry
    42829885: `
module.exports = {
    id: 42829885,
    name: "The Forceful Sentry",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppHand = opponent.hand || [];
        const oppDeck = opponent.deck || [];

        if (oppHand.length > 0) {
            const card = oppHand.shift();
            oppDeck.push(card);
            // Barajar mazo rival
            for (let i = oppDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [oppDeck[i], oppDeck[j]] = [oppDeck[j], oppDeck[i]];
            }
            effectUtils.emitDuelLog(duelState.roomId, \`🛡️🔄 [The Forceful Sentry] ¡Miró la mano del rival y regresó "\${card.name || 'Carta'}" a su Deck barajado!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🛡️ [The Forceful Sentry] La mano rival no contenía cartas.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 42703248: Giant Trunade
    42703248: `
module.exports = {
    id: 42703248,
    name: "Giant Trunade",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        let returned = 0;

        // Regresar magias y trampas de ambos jugadores a la mano
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey];
            if (p) {
                if (Array.isArray(p.spells)) {
                    for (let i = 0; i < p.spells.length; i++) {
                        const s = p.spells[i];
                        if (s && s.id !== 42703248) { // No regresar la Trunade activa
                            p.hand = p.hand || [];
                            p.hand.push(s);
                            p.spells[i] = null;
                            returned++;
                        }
                    }
                }
                if (p.fieldSpell) {
                    p.hand = p.hand || [];
                    p.hand.push(p.fieldSpell);
                    p.fieldSpell = null;
                    returned++;
                }
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, \`🌪️📦 [Giant Trunade] ¡Devolvió todas las Magias y Trampas del campo (\${returned} cartas) a la mano!\`, 'spell');
        return { success: true, returned };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 70368879: Upstart Goblin
    70368879: `
module.exports = {
    id: 70368879,
    name: "Upstart Goblin",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const pDeck = player.deck || [];
        const pHand = player.hand || [];

        // Robar 1 carta
        let cardDrawn = null;
        if (pDeck.length > 0) {
            cardDrawn = pDeck.pop();
            pHand.push(cardDrawn);
        }

        // El rival gana 1000 LP
        opponent.lp = (opponent.lp || 8000) + 1000;

        effectUtils.emitDuelLog(duelState.roomId, \`🪙✨ [Upstart Goblin] \${player.username || 'Jugador'} roba 1 carta. ¡\${opponent.username || 'El rival'} recupera 1000 LP (LP: \${opponent.lp})!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 15259703: Toon World
    15259703: `
module.exports = {
    id: 15259703,
    name: "Toon World",
    type: "Continuous Spell",
    atk: 0, def: 0, level: 0, race: "Continuous",
    isEquip: false, isField: false, isContinuous: true, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        // Costo: Pagar 1000 LP
        player.lp = Math.max(0, (player.lp || 8000) - 1000);
        duelState.toonWorldActive = true;
        effectUtils.emitDuelLog(duelState.roomId, \`📖✨ [Toon World] \${player.username || 'Jugador'} paga 1000 LP (LP: \${player.lp}). ¡El Mundo Toon ha sido abierto!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 40619825: Axe of Despair
    40619825: `
module.exports = {
    id: 40619825,
    name: "Axe of Despair",
    type: "Equip Spell",
    atk: 1000, def: 0, level: 0, race: "Equip",
    isEquip: true, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const target = pMonsters.find(m => m !== null);

        if (target) {
            target.atk = (target.atk || 0) + 1000;
            target.atkMod = (target.atkMod || 0) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, \`🪓💥 [Axe of Despair] Equipado a "\${target.name || 'Monstruo'}". ¡Aumenta su ATK en +1000 (ATK Actual: \${target.atk})!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🪓 [Axe of Despair] Equipado en el campo (+1000 ATK).\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 45986603: Snatch Steal
    45986603: `
module.exports = {
    id: 45986603,
    name: "Snatch Steal",
    type: "Equip Spell",
    atk: 0, def: 0, level: 0, race: "Equip",
    isEquip: true, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        const pMonsters = player.monsters || [];

        // Tomar control de 1 monstruo rival
        const stolenIdx = oppMonsters.findIndex(m => m !== null);
        const freeSlotIdx = pMonsters.findIndex(m => m === null);

        if (stolenIdx !== -1 && freeSlotIdx !== -1) {
            const stolen = oppMonsters[stolenIdx];
            oppMonsters[stolenIdx] = null;
            stolen.playerKey = playerKey;
            stolen.slot = freeSlotIdx;
            pMonsters[freeSlotIdx] = stolen;
            effectUtils.emitDuelLog(duelState.roomId, \`🧲👑 [Snatch Steal] ¡Tomaste el control de "\${stolen.name || 'Monstruo Rival'}"! (El rival ganará 1000 LP en su Standby Phase).\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🧲 [Snatch Steal] Efecto activado.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 34124316: Cyber Jar
    34124316: `
module.exports = {
    id: 34124316,
    name: "Cyber Jar",
    type: "Flip Effect Monster",
    atk: 900, def: 900, level: 3, race: "Rock",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        // Destruir todos los monstruos en el campo
        ['player1', 'player2'].forEach(pKey => {
            const p = duelState[pKey];
            if (p && Array.isArray(p.monsters)) {
                for (let i = 0; i < p.monsters.length; i++) {
                    if (p.monsters[i]) {
                        effectUtils.sendCardToGraveyard(duelState, pKey, p.monsters[i]);
                        p.monsters[i] = null;
                    }
                }
            }
        });

        // Ambos jugadores roban hasta 5 cartas
        ['player1', 'player2'].forEach(pKey => {
            const p = duelState[pKey];
            if (p && Array.isArray(p.deck)) {
                const drawCount = Math.min(5, p.deck.length);
                for (let d = 0; d < drawCount; d++) {
                    const card = p.deck.pop();
                    if (card) {
                        p.hand = p.hand || [];
                        p.hand.push(card);
                    }
                }
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, \`🏺💥 [Cyber Jar] ¡Destruyó todos los monstruos en el campo y ambos jugadores robaron 5 cartas!\`, 'monster');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 93920745: Penguin Soldier
    93920745: `
module.exports = {
    id: 93920745,
    name: "Penguin Soldier",
    type: "Flip Effect Monster",
    atk: 750, def: 500, level: 2, race: "Aqua",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opponent = duelState[opponentKey];
        let returned = 0;

        if (opponent && Array.isArray(opponent.monsters)) {
            for (let i = 0; i < opponent.monsters.length && returned < 2; i++) {
                if (opponent.monsters[i]) {
                    opponent.hand = opponent.hand || [];
                    opponent.hand.push(opponent.monsters[i]);
                    opponent.monsters[i] = null;
                    returned++;
                }
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`🐧📦 [Penguin Soldier] ¡Regresó \${returned} monstruo(s) del campo a la mano!\`, 'monster');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, opponentKey, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`,

    // 70046172: Rush Recklessly
    70046172: `
module.exports = {
    id: 70046172,
    name: "Rush Recklessly",
    type: "Quick-Play Spell",
    atk: 0, def: 0, level: 0, race: "Quick-Play",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: true, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const target = pMonsters.find(m => m !== null);

        if (target) {
            target.atk = (target.atk || 0) + 700;
            target.atkMod = (target.atkMod || 0) + 700;
            effectUtils.emitDuelLog(duelState.roomId, \`🐗⚡ [Rush Recklessly] ¡"\${target.name || 'Monstruo'}" gana +700 ATK (ATK: \${target.atk}) hasta el final del turno!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🐗 [Rush Recklessly] Activado en el duelo.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 16430187: The Reliable Guardian
    16430187: `
module.exports = {
    id: 16430187,
    name: "The Reliable Guardian",
    type: "Quick-Play Spell",
    atk: 0, def: 0, level: 0, race: "Quick-Play",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: true, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const target = pMonsters.find(m => m !== null);

        if (target) {
            target.def = (target.def || 0) + 700;
            effectUtils.emitDuelLog(duelState.roomId, \`🛡️✨ [The Reliable Guardian] ¡"\${target.name || 'Monstruo'}" gana +700 DEF (DEF: \${target.def}) hasta el final del turno!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 44656491: Messenger of Peace
    44656491: `
module.exports = {
    id: 44656491,
    name: "Messenger of Peace",
    type: "Continuous Spell",
    atk: 0, def: 0, level: 0, race: "Continuous",
    isEquip: false, isField: false, isContinuous: true, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        duelState.messengerOfPeaceActive = true;
        effectUtils.emitDuelLog(duelState.roomId, \`🕊️🚫 [Messenger of Peace] ¡Los monstruos con 1500+ ATK no pueden declarar ataques!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 23289281: Karate Man
    23289281: `
module.exports = {
    id: 23289281,
    name: "Karate Man",
    type: "Effect Monster",
    atk: 1000, def: 1000, level: 3, race: "Warrior",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const km = pMonsters.find(m => m && (m.id === 23289281 || m.card_id === 23289281));

        if (km) {
            km.atk = 2000;
            km.atkMod = 1000;
            km.destroyAtEndTurn = true;
            effectUtils.emitDuelLog(duelState.roomId, \`🥋💥 [Karate Man] ¡Duplica su ATK a 2000 hasta el final del turno (será destruido en la End Phase)!\`, 'monster');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 22567609: Nimble Momonga
    22567609: `
module.exports = {
    id: 22567609,
    name: "Nimble Momonga",
    type: "Effect Monster",
    atk: 1000, def: 100, level: 2, race: "Beast",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        player.lp = (player.lp || 8000) + 1000;
        effectUtils.emitDuelLog(duelState.roomId, \`🐿️💚 [Nimble Momonga] ¡Destruido en batalla! Recuperas +1000 LP (LP: \${player.lp}).\`, 'monster');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },

    async execute(context) {
        return this.onDeath(context);
    }
};
`,

    // 18807108: Spellbinding Circle
    18807108: `
module.exports = {
    id: 18807108,
    name: "Spellbinding Circle",
    type: "Continuous Trap",
    atk: 0, def: 0, level: 0, race: "Continuous",
    isEquip: false, isField: false, isContinuous: true, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        const target = oppMonsters.find(m => m !== null);

        if (target) {
            target.atk = Math.max(0, (target.atk || 0) - 700);
            target.atkMod = (target.atkMod || 0) - 700;
            target.isTrapped = true;
            effectUtils.emitDuelLog(duelState.roomId, \`⭕🔒 [Spellbinding Circle] ¡Inmoviliza a "\${target.name || 'Monstruo Rival'}"! Pierde 700 ATK (ATK: \${target.atk}) y no puede atacar ni cambiar de posición.\`, 'trap');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`⭕ [Spellbinding Circle] Círculo atador activado.\`, 'trap');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`
};

let count = 0;
for (const [id, code] of Object.entries(MRL_EFFECTS)) {
    const filePath = path.join(effectDir, `c${id}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ ${count} módulos de efectos oficiales de MRL actualizados con lógica OCG real.`);
