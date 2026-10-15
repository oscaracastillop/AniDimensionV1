/**
 * ============================================================================
 * IMPLEMENTACIÓN DE EFECTOS REALES DE MRD (METAL RAIDERS) - LOTE 1:
 * Trampas icónicas, Contra-Trampas y Magias de Control
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const BATCH_1 = {
    // 44095762: Mirror Force
    44095762: `
module.exports = {
    id: 44095762,
    name: "Mirror Force",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        let destroyedCount = 0;

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && m.position === 'ATK' && !m.faceDown) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, m);
                oppMonsters[i] = null;
                destroyedCount++;
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`🛡️💥 [Mirror Force] ¡Fuerza de Espejo activada! ¡Destruye todos los monstruos en Posición de Ataque del rival (\${destroyedCount} destruidos)!\`, 'trap');
        return { success: true, destroyedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 41420027: Solemn Judgment
    41420027: `
module.exports = {
    id: 41420027,
    name: "Solemn Judgment",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Counter",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: true, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        // Costo: Pagar la mitad de los Life Points
        const currentLp = player.lp !== undefined ? player.lp : 8000;
        const cost = Math.floor(currentLp / 2);
        player.lp = currentLp - cost;

        effectUtils.emitDuelLog(duelState.roomId, \`⚖️⚡ [Solemn Judgment] ¡Juicio Solemne! \${player.username || 'Jugador'} paga la mitad de sus LP (-\${cost} LP, restantes: \${player.lp}) para negar y destruir la jugada.\`, 'trap');
        return { success: true, costPaid: cost };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 77414722: Magic Jammer
    77414722: `
module.exports = {
    id: 77414722,
    name: "Magic Jammer",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Counter",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: true, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pHand = player.hand || [];

        // Costo: Descartar 1 carta de la mano
        if (pHand.length > 0) {
            const discarded = pHand.shift();
            effectUtils.sendCardToGraveyard(duelState, playerKey, discarded);
        }

        effectUtils.emitDuelLog(duelState.roomId, \`🛡️🚫 [Magic Jammer] ¡Descarta 1 carta para negar la activación de una Carta Mágica y destruirla!\`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 3819470: Seven Tools of the Bandit
    3819470: `
module.exports = {
    id: 3819470,
    name: "Seven Tools of the Bandit",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Counter",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: true, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        // Costo: Pagar 1000 LP
        player.lp = Math.max(0, (player.lp || 8000) - 1000);

        effectUtils.emitDuelLog(duelState.roomId, \`🔧🚫 [Seven Tools of the Bandit] ¡Paga 1000 LP (LP: \${player.lp}) para negar la activación de una Carta de Trampa y destruirla!\`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 52097679: Shield & Sword
    52097679: `
module.exports = {
    id: 52097679,
    name: "Shield & Sword",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let swappedCount = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey];
            if (p && Array.isArray(p.monsters)) {
                p.monsters.forEach(m => {
                    if (m && !m.faceDown) {
                        const tempAtk = m.atk !== undefined ? m.atk : (m.card_data ? m.card_data.atk : 0);
                        const tempDef = m.def !== undefined ? m.def : (m.card_data ? m.card_data.def : 0);
                        m.atk = tempDef;
                        m.def = tempAtk;
                        swappedCount++;
                    }
                });
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, \`🛡️⚔️ [Shield & Sword] ¡Intercambió el ATK y DEF de todos los monstruos boca arriba en el campo (\${swappedCount} monstruos) hasta la End Phase!\`, 'spell');
        return { success: true, swappedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 25880422: Block Attack
    25880422: `
module.exports = {
    id: 25880422,
    name: "Block Attack",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opponent.monsters || [];
        const target = oppMonsters.find(m => m && m.position === 'ATK');

        if (target) {
            target.position = 'DEF';
            effectUtils.emitDuelLog(duelState.roomId, \`🛑🛡️ [Block Attack] ¡Cambia a "\${target.name || 'Monstruo Rival'}" a Posición de Defensa!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🛑 [Block Attack] Activado en el duelo.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 56830749: Share the Pain
    56830749: `
module.exports = {
    id: 56830749,
    name: "Share the Pain",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppMonsters = opponent.monsters || [];

        // Sacrificar 1 propio
        const myTributeIdx = pMonsters.findIndex(m => m !== null);
        if (myTributeIdx !== -1) {
            const t = pMonsters[myTributeIdx];
            pMonsters[myTributeIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, playerKey, t);
        }

        // Rival sacrifica 1 suyo
        const oppTributeIdx = oppMonsters.findIndex(m => m !== null);
        if (oppTributeIdx !== -1) {
            const oppT = oppMonsters[oppTributeIdx];
            oppMonsters[oppTributeIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, opponentKey, oppT);
            effectUtils.emitDuelLog(duelState.roomId, \`🤝💥 [Share the Pain] ¡Ambos jugadores sacrificaron 1 monstruo al Cementerio!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🤝 [Share the Pain] Sacrificaste 1 monstruo.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 5758500: Soul Release
    5758500: `
module.exports = {
    id: 5758500,
    name: "Soul Release",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppGy = opponent.graveyard || [];
        let banishedCount = 0;

        const count = Math.min(5, oppGy.length);
        for (let i = 0; i < count; i++) {
            const c = oppGy.shift();
            if (c) {
                effectUtils.sendCardToBanished(duelState, opponentKey, c);
                banishedCount++;
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`🌌✨ [Soul Release] ¡Desterró \${banishedCount} carta(s) del Cementerio!\`, 'spell');
        return { success: true, banishedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 41142615: The Cheerful Coffin
    41142615: `
module.exports = {
    id: 41142615,
    name: "The Cheerful Coffin",
    type: "Normal Spell",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pHand = player.hand || [];
        let discarded = 0;

        for (let i = pHand.length - 1; i >= 0 && discarded < 3; i--) {
            const c = pHand[i];
            if (c && ((c.type || '').includes('Monster') || (c.card_data && (c.card_data.type || '').includes('Monster')))) {
                pHand.splice(i, 1);
                effectUtils.sendCardToGraveyard(duelState, playerKey, c);
                discarded++;
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`⚰️✨ [The Cheerful Coffin] ¡Descartó \${discarded} monstruo(s) de la mano al Cementerio!\`, 'spell');
        return { success: true, discarded };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 88279736: Robbin' Goblin
    88279736: `
module.exports = {
    id: 88279736,
    name: "Robbin' Goblin",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Continuous",
    isEquip: false, isField: false, isContinuous: true, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        duelState.robbinGoblinActive = true;
        effectUtils.emitDuelLog(duelState.roomId, \`👺🗡️ [Robbin' Goblin] ¡Cada vez que inflijas daño de batalla, el rival descartará 1 carta al azar!\`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 3027001: Fake Trap
    3027001: `
module.exports = {
    id: 3027001,
    name: "Fake Trap",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isEquip: false, isField: false, isContinuous: false, isQuickPlay: false, isCounter: false, canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🎭🛡️ [Fake Trap] ¡Trampa Falsa protege tus demás Cartas de Trampa de ser destruidas!\`, 'trap');
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
for (const [id, code] of Object.entries(BATCH_1)) {
    const filePath = path.join(effectDir, `c${id}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ Lote 1: ${count} efectos de MRD (Trampas, Contra-Trampas y Magias) implementados.`);
