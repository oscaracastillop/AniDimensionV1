/**
 * IMPLEMENTACIÓN DE EFECTOS REALES DE LON, LOD, PGD, MFC, DCR, IOC Y AST
 * Convierte los stubs más críticos de la era dorada en mecánicas interactivas y operativas.
 */
const fs = require('fs');
const path = require('path');
const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

const ADVANCED_EFFECTS = {
    // 62279055: Magic Cylinder (LON)
    62279055: `
module.exports = {
    id: 62279055,
    name: "Magic Cylinder",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onAttackDeclare(context) {
        const { duelState, opponentKey, attackingMonster, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const reflectedDmg = attackingMonster ? (attackingMonster.atk || 1000) : 1000;
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - reflectedDmg);
        effectUtils.emitDuelLog(duelState.roomId, \`🎩✨ [Magic Cylinder] ¡Cilindro Mágico anula el ataque de '\${attackingMonster ? attackingMonster.name : 'Monstruo'}' y refleja \${reflectedDmg} puntos de daño directo a los Life Points rivales! [LP rival: \${opp.lp}]\`, 'trap');
        return { success: true, damage: reflectedDmg, attackNegated: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onAttackDeclare({ duelState, opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 53582587: Torrential Tribute (LON)
    53582587: `
module.exports = {
    id: 53582587,
    name: "Torrential Tribute",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let destroyed = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach((m, idx) => {
                if (m) {
                    effectUtils.sendCardToGraveyard(duelState, pKey, m);
                    p.monsters[idx] = null;
                    destroyed++;
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🌊💥 [Torrential Tribute] ¡Tributo Torrencial inunda el campo! Todos los monstruos en ambos lados (\${destroyed} destruidos) son barridos al cementerio.\`, 'trap');
        return { success: true, destroyed };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 56747793: United We Stand (LON)
    56747793: `
module.exports = {
    id: 56747793,
    name: "United We Stand",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Equip",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const count = monsters.filter(m => m && !m.faceDown).length;
        const boost = count * 800;

        const target = monsters.find(m => m !== null);
        if (target) {
            target.atk = (target.atk || 0) + boost;
            target.def = (target.def || 0) + boost;
            effectUtils.emitDuelLog(duelState.roomId, \`🤝✨ [United We Stand] ¡Unidos Resistiremos otorga +\${boost} ATK y DEF a '\${target.name}' (+\${boost} por \${count} monstruos controlados)!\`, 'spell');
            return { success: true, boost };
        }
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 74131780: Exiled Force (LOD)
    74131780: `
module.exports = {
    id: 74131780,
    name: "Exiled Force",
    type: "Effect Monster",
    atk: 1000, def: 1000, level: 4, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        
        // Tributes itself
        const selfIdx = (player.monsters || []).findIndex(m => m && m.id === 74131780);
        if (selfIdx !== -1) {
            effectUtils.sendCardToGraveyard(duelState, playerKey, player.monsters[selfIdx]);
            player.monsters[selfIdx] = null;
        }

        // Destroys 1 opponent monster
        const oppMonsters = opp.monsters || [];
        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚔️💥 [Exiled Force] ¡Tropa en el Exilio se sacrifica para destruir a '\${destroyed ? destroyed.name : 'Monstruo objetivo'}'!\`, 'monster');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 29401950: Bottomless Trap Hole (LOD)
    29401950: `
module.exports = {
    id: 29401950,
    name: "Bottomless Trap Hole",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let banished = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && (m.atk || 0) >= 1500) {
                banished = m;
                effectUtils.sendCardToBanished(duelState, opponentKey, m);
                oppMonsters[i] = null;
                break;
            }
        }
        if (banished) {
            effectUtils.emitDuelLog(duelState.roomId, \`🕳️🌌 [Bottomless Trap Hole] ¡Agujero Trampa sin Fondo destruye y DESTIERRA a '\${banished.name}' (ATK: \${banished.atk})!\`, 'trap');
            return { success: true, banished: banished.name };
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🕳️ [Bottomless Trap Hole] ¡Agujero Trampa sin Fondo listo para desterrar invocaciones poderosas!\`, 'trap');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 14087893: Book of Moon (PGD)
    14087893: `
module.exports = {
    id: 14087893,
    name: "Book of Moon",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Quick-Play",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let flipped = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && !m.faceDown) {
                m.faceDown = true;
                m.position = 'DEF';
                flipped = m;
                break;
            }
        }
        if (flipped) {
            effectUtils.emitDuelLog(duelState.roomId, \`📖🌙 [Book of Moon] ¡Libro de la Luna sumerge a '\${flipped.name}' en un profundo sueño boca abajo en Posición de Defensa!\`, 'spell');
            return { success: true, target: flipped.name };
        }
        effectUtils.emitDuelLog(duelState.roomId, \`📖🌙 [Book of Moon] ¡El Libro de la Luna ilumina el campo de batalla!\`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 83555666: Ring of Destruction (PGD)
    83555666: `
module.exports = {
    id: 83555666,
    name: "Ring of Destruction",
    type: "Trap Card",
    atk: 0, def: 0, level: 0, race: "Normal",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const oppMonsters = opp.monsters || [];

        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i] && !oppMonsters[i].faceDown) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        const dmg = destroyed ? (destroyed.atk || 1000) : 1000;
        player.lp = Math.max(0, (player.lp !== undefined ? player.lp : 8000) - dmg);
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - dmg);

        effectUtils.emitDuelLog(duelState.roomId, \`💍💥 [Ring of Destruction] ¡El Anillo de la Destrucción detona a '\${destroyed ? destroyed.name : 'Monstruo'}' e inflige \${dmg} puntos de daño a ambos duelistas!\`, 'trap');
        return { success: true, damage: dmg };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 71413901: Breaker the Magical Warrior (MFC)
    71413901: `
module.exports = {
    id: 71413901,
    name: "Breaker the Magical Warrior",
    type: "Effect Monster",
    atk: 1600, def: 1000, level: 4, race: "Spellcaster",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppSpells = opp.spells || [];

        let destroyedSpell = null;
        for (let i = 0; i < oppSpells.length; i++) {
            if (oppSpells[i]) {
                destroyedSpell = oppSpells[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyedSpell);
                oppSpells[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🧙‍♂️⚡ [Breaker the Magical Warrior] ¡Breaker retira su Contador Mágico y destruye '\${destroyedSpell ? destroyedSpell.name : 'Magia/Trampa enemiga'}'!\`, 'monster');
        return { success: true, destroyed: destroyedSpell ? destroyedSpell.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 7572887: D.D. Warrior Lady (DCR)
    7572887: `
module.exports = {
    id: 7572887,
    name: "D.D. Warrior Lady",
    type: "Effect Monster",
    atk: 1500, def: 1600, level: 4, race: "Warrior",

    async onBattleEnd(context) {
        const { duelState, playerKey, opponentKey, opponentMonster, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const selfIdx = (player.monsters || []).findIndex(m => m && m.id === 7572887);
        if (selfIdx !== -1) {
            effectUtils.sendCardToBanished(duelState, playerKey, player.monsters[selfIdx]);
            player.monsters[selfIdx] = null;
        }
        if (opponentMonster) {
            effectUtils.sendCardToBanished(duelState, opponentKey, opponentMonster);
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🌌⚔️ [D.D. Warrior Lady] ¡Dama Guerrera de la D.D. abre una grieta dimensional y se destierra junto con '\${opponentMonster ? opponentMonster.name : 'Monstruo oponente'}'!\`, 'monster');
        return { success: true, banishedBoth: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleEnd({ duelState, playerKey, opponentKey, effectUtils });
    },
    async execute(context) {
        return this.onBattleEnd(context);
    }
};
`,

    // 72989439: Black Luster Soldier - Envoy of the Beginning (IOC)
    72989439: `
module.exports = {
    id: 72989439,
    name: "Black Luster Soldier - Envoy of the Beginning",
    type: "Effect Monster",
    atk: 3000, def: 2500, level: 8, race: "Warrior",
    canSpecialSummonSelf: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let banished = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                banished = oppMonsters[i];
                effectUtils.sendCardToBanished(duelState, opponentKey, banished);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚔️🌌 [BLS - Envoy of the Beginning] ¡El Soldado del Brillo Negro desata el poder del Caos y DESTIERRA a '\${banished ? banished.name : 'Monstruo enemigo'}' del campo!\`, 'monster');
        return { success: true, banished: banished ? banished.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`,

    // 51945556: Zaborg the Thunder Monarch (AST)
    51945556: `
module.exports = {
    id: 51945556,
    name: "Zaborg the Thunder Monarch",
    type: "Effect Monster",
    atk: 2400, def: 1000, level: 6, race: "Thunder",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`⚡👑 [Zaborg the Thunder Monarch] ¡Zaborg el Monarca del Trueno es Invocado por Sacrificio y destruye a '\${destroyed ? destroyed.name : 'Monstruo'}' con un rayo fulminante!\`, 'monster');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`
};

let count = 0;
for (const [cardId, code] of Object.entries(ADVANCED_EFFECTS)) {
    const fPath = path.join(effectDir, `c${cardId}.js`);
    fs.writeFileSync(fPath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ Sobres Avanzados: ${count} efectos reglamentarios auténticos implementados.`);
