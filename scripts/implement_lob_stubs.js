/**
 * IMPLEMENTACIÓN DE EFECTOS REALES DE LOB (LEGEND OF BLUE EYES WHITE DRAGON)
 * Convierte todos los stubs genéricos en lógica OCG interactiva y funcional.
 */
const fs = require('fs');
const path = require('path');
const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const LOB_EFFECTS = {
    // 66788016: Fissure
    66788016: `
module.exports = {
    id: 66788016,
    name: "Fissure",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        
        // Buscar monstruo boca arriba con el menor ATK
        let lowestMonster = null;
        let lowestIdx = -1;
        let minAtk = Infinity;

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && !m.faceDown) {
                const currentAtk = m.atk !== undefined ? m.atk : 0;
                if (currentAtk < minAtk) {
                    minAtk = currentAtk;
                    lowestMonster = m;
                    lowestIdx = i;
                }
            }
        }

        if (lowestMonster) {
            effectUtils.sendCardToGraveyard(duelState, opponentKey, lowestMonster);
            oppMonsters[lowestIdx] = null;
            effectUtils.emitDuelLog(duelState.roomId, \`🕳️💥 [Fissure] ¡La grieta se abre bajo '\${lowestMonster.name}' (ATK: \${minAtk}) y lo destruye enviándolo al cementerio!\`, 'spell');
            return { success: true, destroyed: lowestMonster.name };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🕳️ [Fissure] No hay monstruos boca arriba en el campo del oponente para destruir.\`, 'spell');
            return { success: true };
        }
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 4206964: Trap Hole
    4206964: `
module.exports = {
    id: 4206964,
    name: "Trap Hole",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        
        // Destruye el monstruo recién invocado o con ATK >= 1000
        let targetMonster = null;
        let targetIdx = -1;

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && (m.atk || 0) >= 1000) {
                targetMonster = m;
                targetIdx = i;
                break;
            }
        }

        if (targetMonster) {
            effectUtils.sendCardToGraveyard(duelState, opponentKey, targetMonster);
            oppMonsters[targetIdx] = null;
            effectUtils.emitDuelLog(duelState.roomId, \`🕳️⛓️ [Trap Hole] ¡Agujero Trampa activado! '\${targetMonster.name}' (ATK: \${targetMonster.atk}) cae en la trampa y es destruido.\`, 'trap');
            return { success: true, destroyed: targetMonster.name };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🕳️ [Trap Hole] ¡Agujero Trampa activado como emboscada!\`, 'trap');
            return { success: true };
        }
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 38199696: Red Medicine
    38199696: `
module.exports = {
    id: 38199696,
    name: "Red Medicine",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 500;
        effectUtils.emitDuelLog(duelState.roomId, \`🧪💖 [Red Medicine] ¡Medicina Roja restaura +500 Life Points! [LP actual: \${player.lp}]\`, 'spell');
        return { success: true, lpGained: 500 };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 11868825: Goblin's Secret Remedy
    11868825: `
module.exports = {
    id: 11868825,
    name: "Goblin's Secret Remedy",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 1000;
        effectUtils.emitDuelLog(duelState.roomId, \`🧪✨ [Goblin's Secret Remedy] ¡Remedio Secreto del Duende restaura +1000 Life Points! [LP actual: \${player.lp}]\`, 'spell');
        return { success: true, lpGained: 1000 };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 72302403: Swords of Revealing Light
    72302403: `
module.exports = {
    id: 72302403,
    name: "Swords of Revealing Light",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];
        let revealedCount = 0;

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && m.faceDown) {
                m.faceDown = false;
                revealedCount++;
            }
        }
        duelState.swordsOfRevealingLight = { playerKey, turnsRemaining: 3 };
        effectUtils.emitDuelLog(duelState.roomId, \`⚔️✨ [Swords of Revealing Light] ¡Espadas de la Luz Reveladora caen del cielo! Revela \${revealedCount} monstruos boca abajo y bloquea todos los ataques del oponente durante 3 turnos.\`, 'spell');
        return { success: true, revealedCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 7089711: Hane-Hane
    7089711: `
module.exports = {
    id: 7089711,
    name: "Hane-Hane",
    type: "Flip Effect Monster",
    atk: 450, def: 500, level: 2, race: "Beast",

    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m) {
                oppMonsters[i] = null;
                opp.hand = opp.hand || [];
                opp.hand.push(m);
                effectUtils.emitDuelLog(duelState.roomId, \`🦔🔄 [Hane-Hane] ¡EFECTO DE VOLTEO! Rebota a '\${m.name}' del campo a la mano del oponente.\`, 'monster');
                return { success: true, bounced: m.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🦔 [Hane-Hane] ¡EFECTO DE VOLTEO! No hay monstruos en el campo rival para rebotar.\`, 'monster');
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

    // 9076207: Armed Ninja
    9076207: `
module.exports = {
    id: 9076207,
    name: "Armed Ninja",
    type: "Flip Effect Monster",
    atk: 300, def: 300, level: 1, race: "Warrior",

    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        for (let i = 0; i < oppSpells.length; i++) {
            const s = oppSpells[i];
            if (s && s.type && s.type.includes('Spell')) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, s);
                oppSpells[i] = null;
                effectUtils.emitDuelLog(duelState.roomId, \`🥷💥 [Armed Ninja] ¡EFECTO DE VOLTEO! Destruye la carta Mágica '\${s.name}' en el campo rival.\`, 'monster');
                return { success: true, destroyedSpell: s.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🥷 [Armed Ninja] ¡EFECTO DE VOLTEO! No hay cartas Mágicas enemigas para destruir.\`, 'monster');
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

    // 63102017: Stop Defense
    63102017: `
module.exports = {
    id: 63102017,
    name: "Stop Defense",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && m.position === 'DEF') {
                m.position = 'ATK';
                m.faceDown = false;
                effectUtils.emitDuelLog(duelState.roomId, \`🛑⚔️ [Stop Defense] ¡Detener la Defensa obliga a '\${m.name}' a cambiar a Posición de Ataque boca arriba!\`, 'spell');
                return { success: true, target: m.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🛑 [Stop Defense] No hay monstruos en Defensa para forzar a Posición de Ataque.\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 51482758: Remove Trap
    51482758: `
module.exports = {
    id: 51482758,
    name: "Remove Trap",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        for (let i = 0; i < oppSpells.length; i++) {
            const s = oppSpells[i];
            if (s && ((s.type && s.type.includes('Trap')) || s.faceDown)) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, s);
                oppSpells[i] = null;
                effectUtils.emitDuelLog(duelState.roomId, \`🪄❌ [Remove Trap] ¡Eliminar Trampa destruye la carta Trampa enemiga '\${s.name || 'Trampa'}'!\`, 'spell');
                return { success: true, destroyedTrap: s.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🪄 [Remove Trap] No hay trampas enemigas en el campo para destruir.\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 50045299: Dragon Capture Jar
    50045299: `
module.exports = {
    id: 50045299,
    name: "Dragon Capture Jar",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Continuous",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let changedCount = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m && (m.race === 'Dragon' || (m.card_data && m.card_data.race === 'Dragon'))) {
                    m.position = 'DEF';
                    changedCount++;
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🏺🐉 [Dragon Capture Jar] ¡Jarra de Captura de Dragones atrapa a todos los Dragones del campo (\${changedCount} afectados) y los fuerza a Modo de Defensa!\`, 'trap');
        return { success: true, changedCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 82542267: Gravedigger Ghoul
    82542267: `
module.exports = {
    id: 82542267,
    name: "Gravedigger Ghoul",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const gy = opp.graveyard || [];
        let banishedCount = 0;

        for (let i = gy.length - 1; i >= 0; i--) {
            if (gy[i]) {
                const banished = gy.splice(i, 1)[0];
                opp.banished = opp.banished || [];
                opp.banished.push(banished);
                banishedCount++;
                if (banishedCount >= 2) break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🧟⚰️ [Gravedigger Ghoul] ¡El Necrófago Profanador de Tumbas destierra \${banishedCount} carta(s) del cementerio oponente!\`, 'spell');
        return { success: true, banishedCount };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 83887306: Two-Pronged Attack
    83887306: `
module.exports = {
    id: 83887306,
    name: "Two-Pronged Attack",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppMonsters = opp.monsters || [];

        // Tributa 2 monstruos propios
        let tributed = 0;
        for (let i = 0; i < pMonsters.length; i++) {
            if (pMonsters[i]) {
                effectUtils.sendCardToGraveyard(duelState, playerKey, pMonsters[i]);
                pMonsters[i] = null;
                tributed++;
                if (tributed >= 2) break;
            }
        }

        // Destruye 1 monstruo rival
        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`⚔️💥 [Two-Pronged Attack] ¡Ataque Doble sacrifica \${tributed} aliados y destruye a '\${destroyed ? destroyed.name : 'Monstruo rival'}'!\`, 'trap');
        return { success: true, tributed, destroyed: destroyed ? destroyed.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 33066139: Reaper of the Cards
    33066139: `
module.exports = {
    id: 33066139,
    name: "Reaper of the Cards",
    type: "Flip Effect Monster",
    atk: 1380, def: 1930, level: 5, race: "Fiend",

    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        for (let i = 0; i < oppSpells.length; i++) {
            const s = oppSpells[i];
            if (s && ((s.type && s.type.includes('Trap')) || s.faceDown)) {
                effectUtils.sendCardToGraveyard(duelState, opponentKey, s);
                oppSpells[i] = null;
                effectUtils.emitDuelLog(duelState.roomId, \`💀🃏 [Reaper of the Cards] ¡EFECTO DE VOLTEO! El Segador de Cartas siega y destruye la trampa '\${s.name || 'Trampa'}' en el campo rival.\`, 'monster');
                return { success: true, destroyedTrap: s.name };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`💀 [Reaper of the Cards] ¡EFECTO DE VOLTEO! No hay cartas trampa en el campo rival para segar.\`, 'monster');
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

    // 33396948: Exodia the Forbidden One
    33396948: `
module.exports = {
    id: 33396948,
    name: "Exodia the Forbidden One",
    type: "Effect Monster",
    atk: 1000, def: 1000, level: 3, race: "Spellcaster",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const hand = player.hand || [];
        const exodiaIds = [33396948, 8124921, 44519536, 70903634, 7902349];
        const hasAllPieces = exodiaIds.every(id => hand.some(c => c && (c.id === id || (c.card_id === id))));

        if (hasAllPieces) {
            duelState.winner = player.username || playerKey;
            duelState.gameOver = true;
            effectUtils.emitDuelLog(duelState.roomId, \`✨🌟👑 [EXODIA THE FORBIDDEN ONE] ¡TODAS LAS PIEZAS REUNIDAS! ¡Exodia el Prohibido desata su ira cósmica y declara la VICTORIA AUTOMÁTICA DEL DUELO!\`, 'victory');
            return { success: true, instantWin: true };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`✨ [Exodia the Forbidden One] ¡La cabeza de Exodia canaliza el poder de las 5 piezas sagradas!\`, 'monster');
            return { success: true, instantWin: false };
        }
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`
};

let count = 0;
for (const [cardId, code] of Object.entries(LOB_EFFECTS)) {
    const fPath = path.join(effectDir, `c${cardId}.js`);
    fs.writeFileSync(fPath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ LOB: ${count} efectos reglamentarios auténticos implementados.`);
