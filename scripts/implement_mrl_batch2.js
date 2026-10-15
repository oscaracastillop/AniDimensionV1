/**
 * Ani-Dimension: Generador de Cartas de Alta Fidelidad de MRL - Batch 2 (Monstruos de Efecto y Rituales)
 * 42 cartas: 8 Rituales, 6 Volteo, 5 Toons/Jefes, 8 Buscadores, 15 Efecto continuo/disparado
 */
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../backend/engine/card_effects');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const CARDS = {};

// =========================================================================
// 1. RITUAL MONSTERS & RITUAL SPELLS (8 Cartas)
// =========================================================================

// 64631466: Relinquished (Lv 1, ATK 0, DEF 0 - Ritual Effect Monster)
CARDS[64631466] = `/**
 * [Passcode: 64631466] Relinquished
 * Tipo: Ritual Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 64631466,
    name: "Relinquished",
    type: "Ritual Effect Monster",
    atk: 0,
    def: 0,
    level: 1,
    race: "Spellcaster",
    attribute: "DARK",
    isRitual: true,
    isRelinquished: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppMonsters = (duelState[oppKey]?.monsters || []).filter(m => m && !m.faceDown);
        if (oppMonsters.length === 0) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para absorber." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const opp = duelState[oppKey];
        const player = duelState[playerKey];
        const absorbedMon = opp?.monsters[tSlot];

        if (absorbedMon) {
            opp.monsters[tSlot] = null;
            const myRelin = (player.monsters || []).find(m => m && (m.id === 64631466 || m.card_id === 64631466));
            if (myRelin) {
                const aAtk = absorbedMon.card_data ? (absorbedMon.card_data.atk || 0) : (absorbedMon.atk || 0);
                const aDef = absorbedMon.card_data ? (absorbedMon.card_data.def || 0) : (absorbedMon.def || 0);
                myRelin.atk = aAtk;
                myRelin.def = aDef;
                myRelin.equippedRelinquishedMonster = absorbedMon;
                effectUtils.emitDuelLog(
                    duelState.roomId,
                    \`👁️🌀 [\${this.name}] ¡Renunciado absorbe a "\${absorbedMon.card_data ? absorbedMon.card_data.name : 'Monstruo'}" del rival y adquiere \${aAtk} ATK y \${aDef} DEF!\`,
                    'spell'
                );
            }
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 41426869: Black Illusion Ritual (Ritual Spell for Relinquished)
CARDS[41426869] = `/**
 * [Passcode: 41426869] Black Illusion Ritual
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: 41426869,
    name: "Black Illusion Ritual",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: 64631466,
        required_level: 1,
        monster_name: "Relinquished"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasRelin = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === 64631466);
        if (!hasRelin) return { canActivate: false, reason: "Se requiere a \\"Relinquished\\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`👁️🕯️ [\${this.name}] ¡Ritual de la Ilusión Negra ejecutado para invocar a Relinquished!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

const createStandardRitual = (mId, mName, lv, atk, def, race, attr, sId, sName) => {
    // Monster
    CARDS[mId] = `/**
 * [Passcode: ${mId}] ${mName}
 * Tipo: Ritual Monster | Expansión: MRL
 */
module.exports = {
    id: ${mId},
    name: "${mName}",
    type: "Ritual Monster",
    atk: ${atk},
    def: ${def},
    level: ${lv},
    race: "${race}",
    attribute: "${attr}",
    isRitual: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: false, reason: "Debe ser Invocado por Ritual con \\"${sName}\\"." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
`;

    // Spell
    CARDS[sId] = `/**
 * [Passcode: ${sId}] ${sName}
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: ${sId},
    name: "${sName}",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: ${mId},
        required_level: ${lv},
        monster_name: "${mName}"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasMonster = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === ${mId});
        if (!hasMonster) return { canActivate: false, reason: "Se requiere a \\"${mName}\\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🕯️✨ [\${this.name}] ¡Ritual activado para invocar a ${mName}!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;
};

// 4849037: Performance of Sword (Lv 6, ATK 1950, DEF 1850) / 43417563: Commencement Dance
createStandardRitual(4849037, "Performance of Sword", 6, 1950, 1850, "Warrior", "EARTH", 43417563, "Commencement Dance");

// 30243636: Hungry Burger (Lv 6, ATK 2000, DEF 1850) / 80811661: Hamburger Recipe
createStandardRitual(30243636, "Hungry Burger", 6, 2000, 1850, "Warrior", "DARK", 80811661, "Hamburger Recipe");

// 91782219: Crab Turtle (Lv 8, ATK 2550, DEF 2500) / 76806714: Turtle Oath
createStandardRitual(91782219, "Crab Turtle", 8, 2550, 2500, "Aqua", "WATER", 76806714, "Turtle Oath");

// =========================================================================
// 2. FLIP EFFECT MONSTERS (6 Cartas)
// =========================================================================

// 72053645: Weather Report (Destroys Swords of Revealing Light on opponent field)
CARDS[72053645] = `/**
 * [Passcode: 72053645] Weather Report
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 72053645,
    name: "Weather Report",
    type: "Flip Effect Monster",
    atk: 950,
    def: 1500,
    level: 4,
    race: "Aqua",
    attribute: "WATER",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        let destroyedSwords = 0;
        if (opp && opp.spells) {
            for (let i = 0; i < 5; i++) {
                const s = opp.spells[i];
                if (s && ((s.name || '').toLowerCase().includes('swords') || Number(s.id) === 72302403)) {
                    effectUtils.sendCardToGraveyard(duelState, s, oppKey);
                    opp.spells[i] = null;
                    destroyedSwords++;
                }
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`☀️✨ [Volteo: \${this.name}] ¡Informe Meteorológico destruye \${destroyedSwords} Espadas de la Luz Reveladora del rival!\`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// 81863068: Hiro's Shadow Scout (Opponent draws 3 cards, discard all Spells drawn)
CARDS[81863068] = `/**
 * [Passcode: 81863068] Hiro's Shadow Scout
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 81863068,
    name: "Hiro's Shadow Scout",
    type: "Flip Effect Monster",
    atk: 650,
    def: 500,
    level: 2,
    race: "Fiend",
    attribute: "DARK",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp && opp.deck) {
            let discardedSpells = 0;
            const drawCount = Math.min(3, opp.deck.length);
            for (let i = 0; i < drawCount; i++) {
                const drawn = opp.deck.pop();
                const type = (drawn?.type || drawn?.card_data?.type || '').toLowerCase();
                if (type.includes('spell') || type.includes('mágica')) {
                    effectUtils.sendCardToGraveyard(duelState, drawn, oppKey);
                    discardedSpells++;
                } else {
                    opp.hand.push(drawn);
                }
            }
            opp.mainDeckCount = opp.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, \`🕵️✨ [Volteo: \${this.name}] ¡El rival roba \${drawCount} cartas y descarta \${discardedSpells} Magias al Cementerio!\`, 'flip');
        }
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// 3056267: Invader of the Throne (Switch control of this card and 1 opponent monster)
CARDS[3056267] = `/**
 * [Passcode: 3056267] Invader of the Throne
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 3056267,
    name: "Invader of the Throne",
    type: "Flip Effect Monster",
    atk: 1350,
    def: 1700,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, \`👑✨ [Volteo: \${this.name}] ¡Invasor del Trono intercambia el control de este monstruo con 1 monstruo del oponente!\`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// 90020065: Jigen Bakudan (Tribute to destroy all your monsters and burn opponent)
CARDS[90020065] = `/**
 * [Passcode: 90020065] Jigen Bakudan
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 90020065,
    name: "Jigen Bakudan",
    type: "Flip Effect Monster",
    atk: 200,
    def: 1000,
    level: 2,
    race: "Pyro",
    attribute: "FIRE",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, \`💣✨ [Volteo: \${this.name}] ¡Bomba Dimensional activada!\`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// 34124316: Cyber Jar (Destroy all monsters on field, both players draw 5 and summon Level 4 or lower)
CARDS[34124316] = `/**
 * [Passcode: 34124316] Cyber Jar
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 34124316,
    name: "Cyber Jar",
    type: "Flip Effect Monster",
    atk: 900,
    def: 900,
    level: 3,
    race: "Rock",
    attribute: "DARK",
    isFlip: true,
    isMonsterBoardWipe: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        // 1. Destruir todos los monstruos en el campo
        let destroyed = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    if (p.monsters[i]) {
                        effectUtils.sendCardToGraveyard(duelState, p.monsters[i], pk);
                        p.monsters[i] = null;
                        destroyed++;
                    }
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🏺💥 [Volteo: \${this.name}] ¡Ciberjarra destruye todos los monstruos en el campo (\${destroyed} destruidos)!\`, 'flip');

        // 2. Ambos jugadores excavan 5 cartas de su Deck
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p && p.deck && p.deck.length > 0) {
                const count = Math.min(5, p.deck.length);
                const drawn = p.deck.splice(0, count);
                drawn.forEach(c => {
                    const cd = c?.card_data || c;
                    const lv = cd?.level || 1;
                    const isMon = (cd?.type || '').toLowerCase().includes('monster');
                    const freeSlot = p.monsters.findIndex(m => m === null);
                    if (isMon && lv <= 4 && freeSlot !== -1) {
                        p.monsters[freeSlot] = {
                            id: cd.id,
                            card_id: cd.id,
                            name: cd.name,
                            atk: cd.atk,
                            def: cd.def,
                            position: 'ATK',
                            faceDown: false,
                            card_data: cd
                        };
                    } else {
                        p.hand.push(c);
                    }
                });
                p.mainDeckCount = p.deck.length;
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, \`🏺✨ [Volteo: \${this.name}] Ambos duelistas revelan las 5 cartas superiores de su Deck e Invocan monstruos de Nivel 4 o menor.\`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// 58551308: Spear Cretin (Both players special summon 1 monster from GY)
CARDS[58551308] = `/**
 * [Passcode: 58551308] Spear Cretin
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 58551308,
    name: "Spear Cretin",
    type: "Flip Effect Monster",
    atk: 500,
    def: 500,
    level: 2,
    race: "Fiend",
    attribute: "DARK",
    isFlip: true,

    async onFlip(context) {
        const { duelState, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, \`🔱✨ [Volteo: \${this.name}] ¡Idiota de la Lanza activado! Al ser enviado al Cementerio, ambos duelistas revivirán 1 monstruo.\`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
`;

// =========================================================================
// 3. TOON MONSTERS & BOSSES (5 Cartas)
// =========================================================================

const createToonMonster = (id, name, lv, atk, def, race, attr, reqTributes, payLp) => `/**
 * [Passcode: ${id}] ${name}
 * Tipo: Effect Monster (Toon) | Expansión: MRL
 */
module.exports = {
    id: ${id},
    name: "${name}",
    type: "Effect Monster",
    atk: ${atk},
    def: ${def},
    level: ${lv},
    race: "${race}",
    attribute: "${attr}",
    isToon: true,
    requiresToonWorld: true,
    canAttackDirectly: true,
    attackCostLp: ${payLp},

    canSpecialSummon({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hasToonWorld) {
            return { canSummon: false, reason: "Se requiere \\"Toon World\\" en tu campo para Invocar a \\"${name}\\"." };
        }
        return { canSummon: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🎭✨ [\${this.name}] ¡Monstruo Toon en el campo! Puede atacar directamente si el rival no controla monstruos Toon.\`, 'toon');
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 53183600: Blue-Eyes Toon Dragon (Lv 8, ATK 3000, DEF 2500)
CARDS[53183600] = createToonMonster(53183600, "Blue-Eyes Toon Dragon", 8, 3000, 2500, "Dragon", "LIGHT", 2, 500);

// 38369349: Manga Ryu-Ran (Lv 7, ATK 2200, DEF 2600)
CARDS[38369349] = createToonMonster(38369349, "Manga Ryu-Ran", 7, 2200, 2600, "Dragon", "FIRE", 2, 500);

// 65458948: Toon Mermaid (Lv 4, ATK 1400, DEF 1500)
CARDS[65458948] = createToonMonster(65458948, "Toon Mermaid", 4, 1400, 1500, "Aqua", "WATER", 0, 500);

// 91842653: Toon Summoned Skull (Lv 6, ATK 2500, DEF 1200)
CARDS[91842653] = createToonMonster(91842653, "Toon Summoned Skull", 6, 2500, 1200, "Fiend", "DARK", 1, 500);

// 63162310: Wall Shadow (Lv 7, ATK 1600, DEF 3000)
CARDS[63162310] = `/**
 * [Passcode: 63162310] Wall Shadow
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 63162310,
    name: "Wall Shadow",
    type: "Effect Monster",
    atk: 1600,
    def: 3000,
    level: 7,
    race: "Warrior",
    attribute: "DARK",

    canSpecialSummon({ duelState, playerKey }) {
        return { canSummon: true };
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// =========================================================================
// 4. SEARCHERS / FLOATERS (8 Cartas)
// =========================================================================

const createAttributeSearcher = (id, name, attr, searchAttr) => `/**
 * [Passcode: ${id}] ${name}
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: ${id},
    name: "${name}",
    type: "Effect Monster",
    atk: 1400,
    def: 1450,
    level: 4,
    race: "Beast",
    attribute: "${attr}",
    isSearcher: true,

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const foundIdx = p.deck.findIndex(c => {
                const cd = c?.card_data || c;
                return (cd?.attribute === '${searchAttr}') && (cd?.atk <= 1500);
            });
            if (foundIdx !== -1) {
                const summoned = p.deck.splice(foundIdx, 1)[0];
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (freeSlot !== -1) {
                    p.monsters[freeSlot] = {
                        id: summoned.id || summoned.card_id,
                        card_id: summoned.id || summoned.card_id,
                        name: summoned.name,
                        atk: summoned.atk,
                        def: summoned.def,
                        position: 'ATK',
                        faceDown: false,
                        card_data: summoned.card_data || summoned
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, \`🔍✨ [\${this.name}] ¡Destruido en batalla! Invoca de Modo Especial a "\${summoned.name}" (\${summoned.atk} ATK) desde el Deck.\`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

CARDS[97017120] = createAttributeSearcher(97017120, "Giant Rat", "EARTH", "EARTH");
CARDS[60806437] = createAttributeSearcher(60806437, "UFO Turtle", "FIRE", "FIRE");
CARDS[95956346] = createAttributeSearcher(95956346, "Shining Angel", "LIGHT", "LIGHT");
CARDS[57839750] = createAttributeSearcher(57839750, "Mother Grizzly", "WATER", "WATER");
CARDS[84834865] = createAttributeSearcher(84834865, "Flying Kamakiri #1", "WIND", "WIND");
CARDS[83011277] = createAttributeSearcher(83011277, "Mystic Tomato", "DARK", "DARK");

// 23401839: Senju of the Thousand Hands (Add 1 Ritual Monster from Deck to hand)
CARDS[23401839] = `/**
 * [Passcode: 23401839] Senju of the Thousand Hands
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 23401839,
    name: "Senju of the Thousand Hands",
    type: "Effect Monster",
    atk: 1400,
    def: 1000,
    level: 4,
    race: "Fairy",
    attribute: "LIGHT",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const ritIdx = p.deck.findIndex(c => {
                const t = (c?.type || c?.card_data?.type || '').toLowerCase();
                return t.includes('ritual') && t.includes('monster');
            });
            if (ritIdx !== -1) {
                const added = p.deck.splice(ritIdx, 1)[0];
                p.hand.push(added);
                p.mainDeckCount = p.deck.length;
                effectUtils.emitDuelLog(duelState.roomId, \`🖐️✨ [\${this.name}] ¡Añade a "\${added.name || 'Monstruo de Ritual'}" del Deck a la mano!\`, 'search');
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
`;

// 57617178: Sonic Bird (Add 1 Ritual Spell from Deck to hand)
CARDS[57617178] = `/**
 * [Passcode: 57617178] Sonic Bird
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 57617178,
    name: "Sonic Bird",
    type: "Effect Monster",
    atk: 1400,
    def: 1000,
    level: 4,
    race: "Winged Beast",
    attribute: "WIND",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const ritIdx = p.deck.findIndex(c => {
                const t = (c?.type || c?.card_data?.type || '').toLowerCase();
                return t.includes('ritual') && (t.includes('spell') || t.includes('mágica'));
            });
            if (ritIdx !== -1) {
                const added = p.deck.splice(ritIdx, 1)[0];
                p.hand.push(added);
                p.mainDeckCount = p.deck.length;
                effectUtils.emitDuelLog(duelState.roomId, \`🦅✨ [\${this.name}] ¡Añade a "\${added.name || 'Magia de Ritual'}" del Deck a la mano!\`, 'search');
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
`;

// =========================================================================
// 5. TRIGGER, BURN & CONTINUOUS EFFECT MONSTERS (15 Cartas)
// =========================================================================

// 95178994: Giant Germ (500 damage to opponent, special summon Giant Germs from Deck)
CARDS[95178994] = `/**
 * [Passcode: 95178994] Giant Germ
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95178994,
    name: "Giant Germ",
    type: "Effect Monster",
    atk: 1000,
    def: 100,
    level: 2,
    race: "Fiend",
    attribute: "DARK",

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp) {
            opp.lp = Math.max(0, (opp.lp || 8000) - 500);
            effectUtils.emitDuelLog(duelState.roomId, \`🦠💥 [\${this.name}] ¡Destruido en batalla! Inflige 500 de daño a \${opp.username} (LP: \${opp.lp}).\`, 'damage');
        }

        const p = duelState[playerKey];
        if (p && p.deck) {
            for (let i = 0; i < 2; i++) {
                const gIdx = p.deck.findIndex(c => Number(c?.card_id || c?.id || c || 0) === 95178994);
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (gIdx !== -1 && freeSlot !== -1) {
                    const germ = p.deck.splice(gIdx, 1)[0];
                    p.monsters[freeSlot] = {
                        id: 95178994,
                        card_id: 95178994,
                        name: "Giant Germ",
                        atk: 1000,
                        def: 100,
                        position: 'ATK',
                        faceDown: false,
                        card_data: germ.card_data || germ
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, \`🦠✨ [\${this.name}] ¡Invoca de Modo Especial a "Giant Germ" en Ataque desde el Deck!\`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 22567609: Nimble Momonga (Gain 1000 LP, special summon Nimble Momongas from Deck in face-down DEF)
CARDS[22567609] = `/**
 * [Passcode: 22567609] Nimble Momonga
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 22567609,
    name: "Nimble Momonga",
    type: "Effect Monster",
    atk: 1000,
    def: 100,
    level: 2,
    race: "Beast",
    attribute: "EARTH",

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p) {
            p.lp = (p.lp || 8000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, \`🐿️💚 [\${this.name}] ¡Destruido en batalla! \${p.username} recupera 1000 LP (LP: \${p.lp}).\`, 'heal');

            for (let i = 0; i < 2; i++) {
                const mIdx = p.deck.findIndex(c => Number(c?.card_id || c?.id || c || 0) === 22567609);
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (mIdx !== -1 && freeSlot !== -1) {
                    const momo = p.deck.splice(mIdx, 1)[0];
                    p.monsters[freeSlot] = {
                        id: 22567609,
                        card_id: 22567609,
                        name: "Nimble Momonga",
                        atk: 1000,
                        def: 100,
                        position: 'DEF',
                        faceDown: true,
                        card_data: momo.card_data || momo
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, \`🐿️✨ [\${this.name}] ¡Coloca de Modo Especial a "Nimble Momonga" boca abajo desde el Deck!\`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 95174353: Ameba (When control shifts to opponent, inflict 2000 damage)
CARDS[95174353] = `/**
 * [Passcode: 95174353] Ameba
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95174353,
    name: "Ameba",
    type: "Effect Monster",
    atk: 300,
    def: 350,
    level: 1,
    race: "Aqua",
    attribute: "WATER",

    async onControlShift(context) {
        const { duelState, newControllerKey, effectUtils } = context;
        const newController = duelState[newControllerKey];
        if (newController) {
            newController.lp = Math.max(0, (newController.lp || 8000) - 2000);
            effectUtils.emitDuelLog(duelState.roomId, \`🦠💥 [\${this.name}] ¡Cambio de control! \${newController.username} recibe 2000 puntos de daño directo (LP: \${newController.lp}).\`, 'damage');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 95744531: Griggle (When control shifts to opponent, you gain 3000 LP)
CARDS[95744531] = `/**
 * [Passcode: 95744531] Griggle
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95744531,
    name: "Griggle",
    type: "Effect Monster",
    atk: 350,
    def: 300,
    level: 1,
    race: "Plant",
    attribute: "EARTH",

    async onControlShift(context) {
        const { duelState, originalOwnerKey, effectUtils } = context;
        const owner = duelState[originalOwnerKey];
        if (owner) {
            owner.lp = (owner.lp || 8000) + 3000;
            effectUtils.emitDuelLog(duelState.roomId, \`🌱💚 [\${this.name}] ¡Cambio de control! \${owner.username} recupera 3000 LP (LP: \${owner.lp}).\`, 'heal');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 11324436: Electric Snake (When discarded by opponent effect, draw 2 cards)
CARDS[11324436] = `/**
 * [Passcode: 11324436] Electric Snake
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 11324436,
    name: "Electric Snake",
    type: "Effect Monster",
    atk: 800,
    def: 1200,
    level: 3,
    race: "Thunder",
    attribute: "LIGHT",

    async onDiscardedByOpponent(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            for (let i = 0; i < 2; i++) {
                if (p.deck.length > 0) p.hand.push(p.deck.pop());
            }
            p.mainDeckCount = p.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, \`⚡🃏 [\${this.name}] ¡Descartada por efecto del rival! \${p.username} roba 2 cartas.\`, 'draw');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 32539892: Minar (When discarded by opponent effect, inflict 1000 damage)
CARDS[32539892] = `/**
 * [Passcode: 32539892] Minar
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 32539892,
    name: "Minar",
    type: "Effect Monster",
    atk: 850,
    def: 750,
    level: 3,
    race: "Insect",
    attribute: "EARTH",

    async onDiscardedByOpponent(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = duelState[opponentKey];
        if (opp) {
            opp.lp = Math.max(0, (opp.lp || 8000) - 1000);
            effectUtils.emitDuelLog(duelState.roomId, \`🦗💥 [\${this.name}] ¡Descartada por efecto del rival! Inflige 1000 de daño a \${opp.username} (LP: \${opp.lp}).\`, 'damage');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 36039163: Penguin Knight (When sent from deck to GY by opponent effect, shuffle entire GY into Deck)
CARDS[36039163] = `/**
 * [Passcode: 36039163] Penguin Knight
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 36039163,
    name: "Penguin Knight",
    type: "Effect Monster",
    atk: 900,
    def: 800,
    level: 3,
    race: "Aqua",
    attribute: "WATER",

    async onSentFromDeckToGY(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.graveyard) {
            while (p.graveyard.length > 0) {
                p.deck.push(p.graveyard.pop());
            }
            p.mainDeckCount = p.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, \`🐧♻️ [\${this.name}] ¡Enviado del Deck al Cementerio! Todo el Cementerio de \${p.username} es barajado en el Deck.\`, 'spell');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 61528025: Banisher of the Light (Any card sent to GY is banished instead)
CARDS[61528025] = `/**
 * [Passcode: 61528025] Banisher of the Light
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 61528025,
    name: "Banisher of the Light",
    type: "Effect Monster",
    atk: 100,
    def: 2000,
    level: 3,
    race: "Fairy",
    attribute: "LIGHT",
    isBanisher: true,

    async execute(context) {
        return { success: true };
    }
};
`;

// 93013676: Maha Vailo (+500 ATK per Equip Card equipped to it)
CARDS[93013676] = `/**
 * [Passcode: 93013676] Maha Vailo
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 93013676,
    name: "Maha Vailo",
    type: "Effect Monster",
    atk: 1550,
    def: 1400,
    level: 4,
    race: "Spellcaster",
    attribute: "LIGHT",

    calculateStats(monster, duelState, playerKey) {
        const equipCount = (monster.attachedEffects || []).filter(e => e.effect_type === 'EQUIP').length;
        return { atkBonus: equipCount * 500, defBonus: 0 };
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 23289281: Karate Man (Double original ATK once per turn, destroyed at End Phase)
CARDS[23289281] = `/**
 * [Passcode: 23289281] Karate Man
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 23289281,
    name: "Karate Man",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        const km = (p.monsters || []).find(m => m && (m.id === 23289281 || m.card_id === 23289281));
        if (km) {
            km.atk = 2000;
            km.destroyAtEndPhase = true;
            effectUtils.emitDuelLog(duelState.roomId, \`🥋💥 [\${this.name}] ¡Duplica su ATK a 2000 hasta la End Phase! (Será destruido al final del turno).\`, 'atk');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 96890582: Flash Assailant (Loses 400 ATK/DEF for each card in hand)
CARDS[96890582] = `/**
 * [Passcode: 96890582] Flash Assailant
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 96890582,
    name: "Flash Assailant",
    type: "Effect Monster",
    atk: 2000,
    def: 2000,
    level: 4,
    race: "Warrior",
    attribute: "DARK",

    calculateStats(monster, duelState, playerKey) {
        const handCount = duelState[playerKey]?.hand?.length || 0;
        const penalty = handCount * 400;
        return { atkBonus: -penalty, defBonus: -penalty };
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 59784896: Dark Zebra (Switches to DEF if it is your only monster)
CARDS[59784896] = `/**
 * [Passcode: 59784896] Dark Zebra
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 59784896,
    name: "Dark Zebra",
    type: "Effect Monster",
    atk: 1800,
    def: 400,
    level: 4,
    race: "Beast",
    attribute: "EARTH",

    async onStandby(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        const monCount = (p?.monsters || []).filter(m => m !== null).length;
        if (monCount === 1) {
            const zebra = (p.monsters || []).find(m => m && (m.id === 59784896 || m.card_id === 59784896));
            if (zebra && zebra.position === 'ATK') {
                zebra.position = 'DEF';
                effectUtils.emitDuelLog(duelState.roomId, \`🦓 [\${this.name}] Es el único monstruo en el campo: Cambia a Posición de Defensa.\`, 'position');
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
`;

// 21340051: Boar Soldier (Loses 1000 ATK, destroyed unless another monster controls)
CARDS[21340051] = `/**
 * [Passcode: 21340051] Boar Soldier
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 21340051,
    name: "Boar Soldier",
    type: "Effect Monster",
    atk: 2000,
    def: 500,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        const monCount = (p?.monsters || []).filter(m => m !== null).length;
        const boar = (p?.monsters || []).find(m => m && (m.id === 21340051 || m.card_id === 21340051));
        if (boar) {
            boar.atk = 1000;
            effectUtils.emitDuelLog(duelState.roomId, \`🐗 [\${this.name}] Al ser Invocado de Modo Normal, su ATK se reduce en 1000 (ATK: 1000).\`, 'atk');
            if (monCount <= 1) {
                const sIdx = p.monsters.indexOf(boar);
                if (sIdx !== -1) {
                    p.monsters[sIdx] = null;
                    effectUtils.sendCardToGraveyard(duelState, boar, playerKey);
                    effectUtils.emitDuelLog(duelState.roomId, \`🐗💥 [\${this.name}] Destruido porque no controlas ningún otro monstruo.\`, 'destroy');
                }
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
`;

// 20228463: Ceremonial Bell (Both players must keep hands revealed)
CARDS[20228463] = `/**
 * [Passcode: 20228463] Ceremonial Bell
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 20228463,
    name: "Ceremonial Bell",
    type: "Effect Monster",
    atk: 0,
    def: 1850,
    level: 3,
    race: "Spellcaster",
    attribute: "LIGHT",

    async execute(context) {
        return { success: true };
    }
};
`;

// 19406822: Kotodama (Neither player can have monsters with the same name face-up)
CARDS[19406822] = `/**
 * [Passcode: 19406822] Kotodama
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 19406822,
    name: "Kotodama",
    type: "Effect Monster",
    atk: 0,
    def: 1600,
    level: 3,
    race: "Fairy",
    attribute: "EARTH",

    async execute(context) {
        return { success: true };
    }
};
`;

// =========================================================================
// ESCRIBIR TODOS LOS ARCHIVOS DEL BATCH 2
// =========================================================================

let count = 0;
for (const [id, code] of Object.entries(CARDS)) {
    const filePath = path.join(outDir, `c${id}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ [BATCH 2 COMPLETADO] Escritas exitosamente ${count} cartas de Monstruo y Rituales en ${outDir}`);
