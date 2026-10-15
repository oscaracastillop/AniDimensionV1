/**
 * IMPLEMENTACIÓN DE EFECTOS REALES DE PSV (PHARAOH'S SERVANT)
 * Implementa mecánicas icónicas: Jinzo, Nobleman of Crossout, Mirror Wall, etc.
 */
const fs = require('fs');
const path = require('path');
const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const PSV_EFFECTS = {
    // 77585513: Jinzo
    77585513: `
module.exports = {
    id: 77585513,
    name: "Jinzo",
    type: "Effect Monster",
    atk: 2400, def: 1500, level: 6, race: "Machine",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        duelState.trapsNegated = true;
        effectUtils.emitDuelLog(duelState.roomId, \`🤖🚫 [Jinzo] ¡Efecto continuo de Jinzo activo! Las cartas Trampa no se pueden activar y todos los efectos de Trampas en el campo quedan anulados.\`, 'monster');
        return { success: true, trapsNegated: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 71044499: Nobleman of Crossout
    71044499: `
module.exports = {
    id: 71044499,
    name: "Nobleman of Crossout",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        
        let targetMonster = null;
        let targetIdx = -1;

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && m.faceDown) {
                targetMonster = m;
                targetIdx = i;
                break;
            }
        }

        if (targetMonster) {
            effectUtils.sendCardToBanished(duelState, opponentKey, targetMonster);
            oppMonsters[targetIdx] = null;
            effectUtils.emitDuelLog(duelState.roomId, \`🗡️🚫 [Nobleman of Crossout] ¡El Noble del Exterminio destierra al monstruo boca abajo '\${targetMonster.name}'!\`, 'spell');
            return { success: true, banished: targetMonster.name };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🗡️ [Nobleman of Crossout] No hay monstruos boca abajo para desterrar.\`, 'spell');
            return { success: true };
        }
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 17449108: Nobleman of Extermination
    17449108: `
module.exports = {
    id: 17449108,
    name: "Nobleman of Extermination",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        let targetSpell = null;
        let targetIdx = -1;

        for (let i = 0; i < oppSpells.length; i++) {
            const s = oppSpells[i];
            if (s && s.faceDown) {
                targetSpell = s;
                targetIdx = i;
                break;
            }
        }

        if (targetSpell) {
            effectUtils.sendCardToBanished(duelState, opponentKey, targetSpell);
            oppSpells[targetIdx] = null;
            effectUtils.emitDuelLog(duelState.roomId, \`🗡️📜 [Nobleman of Extermination] ¡Destierra la carta mágica/trampa boca abajo '\${targetSpell.name || 'Set Card'}'!\`, 'spell');
            return { success: true, banished: targetSpell.name };
        }
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 22359980: Mirror Wall
    22359980: `
module.exports = {
    id: 22359980,
    name: "Mirror Wall",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Continuous",

    async onDamageCalculation(context) {
        const { duelState, attackingMonster, effectUtils } = context;
        if (attackingMonster) {
            const oldAtk = attackingMonster.atk || 0;
            attackingMonster.atk = Math.floor(oldAtk / 2);
            effectUtils.emitDuelLog(duelState.roomId, \`🪞🛡️ [Mirror Wall] ¡Pared de Espejo divide a la mitad el ATK del atacante (\${oldAtk} -> \${attackingMonster.atk})!\`, 'trap');
            return { success: true, halved: true };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🪞 [Mirror Wall] ¡Pared de Espejo erigida! Cortará el ataque enemigo a la mitad.\`, 'trap');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 96355986: Enchanted Javelin
    96355986: `
module.exports = {
    id: 96355986,
    name: "Enchanted Javelin",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onAttackDeclare(context) {
        const { duelState, playerKey, attackingMonster, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const heal = attackingMonster ? (attackingMonster.atk || 1000) : 1000;
        player.lp = (player.lp !== undefined ? player.lp : 8000) + heal;
        effectUtils.emitDuelLog(duelState.roomId, \`🔱💖 [Enchanted Javelin] ¡Jabalina Encantada absorbe el poder atacante y restaura +\${heal} Life Points! [LP actual: \${player.lp}]\`, 'trap');
        return { success: true, healed: heal };
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

    // 43434803: The Shallow Grave
    43434803: `
module.exports = {
    id: 43434803,
    name: "The Shallow Grave",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            const gy = p.graveyard || [];
            const monsterIdx = gy.findIndex(c => c && (c.type ? c.type.includes('Monster') : true));
            if (monsterIdx !== -1) {
                const revived = gy.splice(monsterIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => m === null);
                if (emptySlot !== -1) {
                    p.monsters[emptySlot] = {
                        ...revived,
                        position: 'DEF',
                        faceDown: true
                    };
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, \`⚰️🎴 [The Shallow Grave] ¡La Tumba Superficial invoca 1 monstruo en Posición de Defensa boca abajo para cada jugador!\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 79106360: Morphing Jar #2
    79106360: `
module.exports = {
    id: 79106360,
    name: "Morphing Jar #2",
    type: "Flip Effect Monster",
    atk: 800, def: 700, level: 3, race: "Rock",

    async onFlip(context) {
        const { duelState, effectUtils } = context;
        let returnedMonsters = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach((m, idx) => {
                if (m) {
                    p.deck = p.deck || [];
                    p.deck.push(m);
                    p.monsters[idx] = null;
                    returnedMonsters++;
                }
            });
            if (p.deck) p.deck.sort(() => Math.random() - 0.5);
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🏺🌀 [Morphing Jar #2] ¡EFECTO DE VOLTEO! Jarra de la Metamorfosis #2 devuelve todos los monstruos (\${returnedMonsters}) al Deck y los baraja.\`, 'monster');
        return { success: true, returnedMonsters };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, effectUtils });
    },
    async execute(context) {
        return this.onFlip(context);
    }
};
`
};

let count = 0;
for (const [cardId, code] of Object.entries(PSV_EFFECTS)) {
    const fPath = path.join(effectDir, `c${cardId}.js`);
    fs.writeFileSync(fPath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ PSV: ${count} efectos reglamentarios auténticos implementados.`);
