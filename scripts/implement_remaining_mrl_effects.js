const fs = require('fs');
const path = require('path');

const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const EFFECTS_PART2 = {
    // 97017120: Giant Rat
    97017120: `
module.exports = {
    id: 97017120, name: "Giant Rat", type: "Effect Monster", atk: 1400, def: 1450, level: 4, race: "Beast",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        // Invocar monstruo TIERRA con <= 1500 ATK
        const earthIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'EARTH' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (earthIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(earthIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`🐀✨ [Giant Rat] ¡Invocó Especialmente a "\${summoned.name}" (TIERRA) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🐀 [Giant Rat] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 95956346: Shining Angel
    95956346: `
module.exports = {
    id: 95956346, name: "Shining Angel", type: "Effect Monster", atk: 1400, def: 800, level: 4, race: "Fairy",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        const lightIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'LIGHT' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (lightIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(lightIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`👼✨ [Shining Angel] ¡Invocó Especialmente a "\${summoned.name}" (LUZ) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`👼 [Shining Angel] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 57839750: Mother Grizzly
    57839750: `
module.exports = {
    id: 57839750, name: "Mother Grizzly", type: "Effect Monster", atk: 1400, def: 1000, level: 4, race: "Beast-Warrior",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        const waterIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'WATER' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (waterIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(waterIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`🐻🌊 [Mother Grizzly] ¡Invocó Especialmente a "\${summoned.name}" (AGUA) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🐻 [Mother Grizzly] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 60806437: UFO Turtle
    60806437: `
module.exports = {
    id: 60806437, name: "UFO Turtle", type: "Effect Monster", atk: 1400, def: 1200, level: 4, race: "Machine",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        const fireIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'FIRE' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (fireIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(fireIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`🛸🔥 [UFO Turtle] ¡Invocó Especialmente a "\${summoned.name}" (FUEGO) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🛸 [UFO Turtle] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 84834865: Flying Kamakiri #1
    84834865: `
module.exports = {
    id: 84834865, name: "Flying Kamakiri #1", type: "Effect Monster", atk: 1400, def: 900, level: 4, race: "Insect",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        const windIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'WIND' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (windIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(windIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`🦗🌪️ [Flying Kamakiri #1] ¡Invocó Especialmente a "\${summoned.name}" (VIENTO) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🦗 [Flying Kamakiri #1] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 83011277: Mystic Tomato
    83011277: `
module.exports = {
    id: 83011277, name: "Mystic Tomato", type: "Effect Monster", atk: 1400, def: 1100, level: 4, race: "Plant",
    async onDeath(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pMonsters = player.monsters || [];
        const darkIdx = pDeck.findIndex(c => (c.attribute || '').toUpperCase() === 'DARK' && (c.atk || 0) <= 1500);
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (darkIdx !== -1 && freeSlot !== -1) {
            const summoned = pDeck.splice(darkIdx, 1)[0];
            summoned.position = 'ATK';
            summoned.faceDown = false;
            summoned.slot = freeSlot;
            summoned.playerKey = playerKey;
            pMonsters[freeSlot] = summoned;
            effectUtils.emitDuelLog(duelState.roomId, \`🍅🌑 [Mystic Tomato] ¡Invocó Especialmente a "\${summoned.name}" (OSCURIDAD) desde el Deck!\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🍅 [Mystic Tomato] Destruido en batalla.\`, 'monster');
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDeath({ duelState, playerKey, effectUtils });
    },
    async execute(context) { return this.onDeath(context); }
};`,

    // 93013676: Maha Vailo
    93013676: `
module.exports = {
    id: 93013676, name: "Maha Vailo", type: "Effect Monster", atk: 1550, def: 1400, level: 4, race: "Spellcaster",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const mv = pMonsters.find(m => m && (m.id === 93013676 || m.card_id === 93013676));
        if (mv) {
            const equipsCount = (player.spells || []).filter(s => s && s.isEquip).length;
            const boost = equipsCount * 500;
            mv.atk = 1550 + boost;
            effectUtils.emitDuelLog(duelState.roomId, \`⚡ [Maha Vailo] Gana +500 ATK por cada carta de equipo (ATK: \${mv.atk}).\`, 'monster');
        }
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 95174353: Ameba
    95174353: `
module.exports = {
    id: 95174353, name: "Ameba", type: "Effect Monster", atk: 300, def: 350, level: 1, race: "Aqua",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opponent = duelState[opponentKey] || {};
        opponent.lp = Math.max(0, (opponent.lp || 8000) - 2000);
        effectUtils.emitDuelLog(duelState.roomId, \`🦠💥 [Ameba] ¡Control transferido! Inflige 2000 puntos de daño al rival (LP: \${opponent.lp}).\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 95744531: Griggle
    95744531: `
module.exports = {
    id: 95744531, name: "Griggle", type: "Effect Monster", atk: 350, def: 300, level: 1, race: "Plant",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        player.lp = (player.lp || 8000) + 3000;
        effectUtils.emitDuelLog(duelState.roomId, \`🌱💚 [Griggle] ¡Control transferido! Recuperas +3000 LP (LP: \${player.lp}).\`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 82003859: Toll
    82003859: `
module.exports = {
    id: 82003859, name: "Toll", type: "Continuous Spell", atk: 0, def: 0, level: 0, race: "Continuous", isContinuous: true,
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        duelState.tollActive = true;
        effectUtils.emitDuelLog(duelState.roomId, \`🪙⚔️ [Toll] ¡Ambos jugadores deben pagar 500 LP para declarar un ataque!\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 79323590: Chain Energy
    79323590: `
module.exports = {
    id: 79323590, name: "Chain Energy", type: "Continuous Spell", atk: 0, def: 0, level: 0, race: "Continuous", isContinuous: true,
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        duelState.chainEnergyActive = true;
        effectUtils.emitDuelLog(duelState.roomId, \`⛓️⚡ [Chain Energy] ¡Ambos jugadores deben pagar 500 LP por cada carta que jueguen o invoquen desde su mano!\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 12470447: Curse of Fiend
    12470447: `
module.exports = {
    id: 12470447, name: "Curse of Fiend", type: "Normal Spell", atk: 0, def: 0, level: 0, race: "Normal",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let changed = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = duelState[pKey];
            if (p && Array.isArray(p.monsters)) {
                p.monsters.forEach(m => {
                    if (m) {
                        m.position = m.position === 'ATK' ? 'DEF' : 'ATK';
                        changed++;
                    }
                });
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, \`😈🔄 [Curse of Fiend] ¡Cambió la posición de batalla de todos los monstruos en el campo (\${changed} monstruos)!\`, 'spell');
        return { success: true, changed };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 64631466: Relinquished (Ritual Effect Monster)
    64631466: `
module.exports = {
    id: 64631466, name: "Relinquished", type: "Ritual Effect Monster", atk: 0, def: 0, level: 1, race: "Spellcaster",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppMonsters = opponent.monsters || [];
        const rel = pMonsters.find(m => m && (m.id === 64631466 || m.card_id === 64631466));

        // Absorber 1 monstruo rival
        const oppTarget = oppMonsters.find(m => m !== null);
        if (rel && oppTarget) {
            const oppIdx = oppMonsters.indexOf(oppTarget);
            oppMonsters[oppIdx] = null;
            rel.absorbedMonster = oppTarget;
            rel.atk = oppTarget.atk || 0;
            rel.def = oppTarget.def || 0;
            effectUtils.emitDuelLog(duelState.roomId, \`👁️🌀 [Relinquished] ¡Absorbió a "\${oppTarget.name || 'Monstruo Rival'}"! ATK: \${rel.atk} / DEF: \${rel.def}.\`, 'monster');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`👁️ [Relinquished] Efecto de absorción activado.\`, 'monster');
        }
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`,

    // 41426869: Black Illusion Ritual
    41426869: `
module.exports = {
    id: 41426869, name: "Black Illusion Ritual", type: "Ritual Spell", atk: 0, def: 0, level: 0, race: "Ritual",
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pHand = player.hand || [];
        const pMonsters = player.monsters || [];
        const relIdx = pHand.findIndex(c => c && (c.id === 64631466 || c.card_id === 64631466));
        const freeSlot = pMonsters.findIndex(m => m === null);

        if (relIdx !== -1 && freeSlot !== -1) {
            const rel = pHand.splice(relIdx, 1)[0];
            rel.position = 'ATK';
            rel.faceDown = false;
            rel.slot = freeSlot;
            rel.playerKey = playerKey;
            pMonsters[freeSlot] = rel;
            effectUtils.emitDuelLog(duelState.roomId, \`🕯️👁️ [Black Illusion Ritual] ¡Invocación por Ritual exitosa: "Relinquished" aparece en el campo!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🕯️ [Black Illusion Ritual] Ritual activado.\`, 'spell');
        }
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};`
};

let count = 0;
for (const [id, code] of Object.entries(EFFECTS_PART2)) {
    const filePath = path.join(effectDir, `c${id}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ ${count} módulos adicionales de efectos de MRL actualizados.`);
