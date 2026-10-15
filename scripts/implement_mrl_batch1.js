/**
 * Ani-Dimension: Generador de Cartas de Alta Fidelidad de MRL - Batch 1 (Magias y Trampas)
 * 39 cartas: 8 Equip, 7 Campo, 5 Continuas, 10 Normales, 4 Quick-Play, 5 Trampas
 */
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../backend/engine/card_effects');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const CARDS = {};

// =========================================================================
// 1. EQUIP SPELLS (8 Cartas)
// =========================================================================

// 40619825: Axe of Despair (+1000 ATK)
CARDS[40619825] = `/**
 * [Passcode: 40619825] Axe of Despair
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 40619825,
    name: "Axe of Despair",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 1000,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        if (!target) return false;
        return true;
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m, p1Monsters.includes(m)));
        if (!hasValidMonster) {
            return {
                canActivate: false,
                reason: "No hay ningún monstruo boca arriba en el campo para equipar \\"Axe of Despair\\"."
            };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && this.canEquip(m.card_data || m, pKey === playerKey)) {
                    valid.push({ playerKey: pKey, slotIndex: idx });
                }
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        const ownerNotice = (tPlayerKey !== playerKey) ? " del rival" : "";
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🪓✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"\${ownerNotice} (+1000 ATK).\`,
            'spell'
        );
        return { success: true };
    },

    async onSentToGraveyard(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (!p) return;
        const hasTribute = p.monsters && p.monsters.some(m => m !== null);
        if (hasTribute) {
            effectUtils.emitDuelLog(duelState.roomId, \`🪓♻️ [\${this.name}] Enviada al Cementerio: Puedes tributar 1 monstruo para regresarla a la cima de tu Deck.\`, 'spell');
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 65169794: Black Pendant (+500 ATK, 500 damage when sent to GY)
CARDS[65169794] = `/**
 * [Passcode: 65169794] Black Pendant
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 65169794,
    name: "Black Pendant",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 500,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) {
            return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        const ownerNotice = (tPlayerKey !== playerKey) ? " del rival" : "";
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🖤✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"\${ownerNotice} (+500 ATK).\`,
            'spell'
        );
        return { success: true };
    },

    async onSentToGraveyard(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp) {
            const dmg = 500;
            opp.lp = Math.max(0, (opp.lp || 8000) - dmg);
            effectUtils.emitDuelLog(duelState.roomId, \`🖤💥 [\${this.name}] Enviada al Cementerio: ¡Inflige \${dmg} puntos de daño directo a \${opp.username}! (LP restantes: \${opp.lp})\`, 'damage');
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 38552107: Horn of Light (+800 DEF)
CARDS[38552107] = `/**
 * [Passcode: 38552107] Horn of Light
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 38552107,
    name: "Horn of Light",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 0,
    defDelta: 800,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🦄✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (+800 DEF).\`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 99597615: Malevolent Nuzzler (+700 ATK)
CARDS[99597615] = `/**
 * [Passcode: 99597615] Malevolent Nuzzler
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 99597615,
    name: "Malevolent Nuzzler",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 700,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`😈✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (+700 ATK).\`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 45986603: Snatch Steal (Equip to opponent monster, take control, opponent gains 1000 LP in their Standby)
CARDS[45986603] = `/**
 * [Passcode: 45986603] Snatch Steal
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 45986603,
    name: "Snatch Steal",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    isControlSteal: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = false) {
        if (!target) return false;
        // Sólo se puede equipar a un monstruo que controle el adversario
        return !isOwnMonster;
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppMonsters = duelState[oppKey]?.monsters || [];
        const hasOppMonster = oppMonsters.some(m => m && !m.faceDown);
        if (!hasOppMonster) {
            return { canActivate: false, reason: "El rival no controla ningún monstruo boca arriba para tomar el control." };
        }
        const myMonsters = duelState[playerKey]?.monsters || [];
        const hasFreeSlot = myMonsters.some(m => m === null);
        if (!hasFreeSlot) {
            return { canActivate: false, reason: "No tienes casillas libres de monstruos para recibir el control." };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
            if (m && !m.faceDown) {
                valid.push({ playerKey: oppKey, slotIndex: idx });
            }
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const opp = duelState[oppKey];
        const player = duelState[playerKey];

        const targetMonster = (targetSlot !== undefined && opp && opp.monsters) ? opp.monsters[targetSlot] : null;
        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        const freeSlot = player.monsters.findIndex(m => m === null);
        if (freeSlot === -1) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Campo lleno.\`, 'spell');
            return { success: false, reason: "Campo lleno." };
        }

        // Transferir monstruo del rival al campo del activador
        opp.monsters[targetSlot] = null;
        targetMonster.originalOwner = oppKey;
        targetMonster.isStolen = true;
        targetMonster.slot = freeSlot;
        player.monsters[freeSlot] = targetMonster;

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            equippedBy: playerKey,
            onOpponentStandbyGainLp: 1000
        });

        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🫳✨ [\${this.name}] ¡\${player.username} toma el control de "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" del rival! (El rival recuperará 1000 LP en cada una de sus Standby Phases).\`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 64047146: Horn of the Unicorn (+700 ATK/DEF, returns to top of Deck)
CARDS[64047146] = `/**
 * [Passcode: 64047146] Horn of the Unicorn
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 64047146,
    name: "Horn of the Unicorn",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 700,
    defDelta: 700,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: this.atkDelta,
            defDelta: this.defDelta,
            equippedBy: playerKey
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🦄✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (+700 ATK / +700 DEF).\`,
            'spell'
        );
        return { success: true };
    },

    async onSentToGraveyard(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            p.deck.push({ id: this.id, card_id: this.id, name: this.name, type: this.type });
            p.mainDeckCount = p.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, \`🦄♻️ [\${this.name}] Regresa a la parte superior del Deck.\`, 'spell');
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 64389297: Magical Labyrinth (Equip only to Labyrinth Wall, tribute to summon Wall Shadow from deck)
CARDS[64389297] = `/**
 * [Passcode: 64389297] Magical Labyrinth
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 64389297,
    name: "Magical Labyrinth",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        if (!target) return false;
        const tData = target.card_data || target;
        const name = (tData.name || '').toLowerCase();
        return name.includes('labyrinth wall') || name.includes('muro del laberinto') || Number(tData.id) === 67284908;
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const pMonsters = duelState[playerKey]?.monsters || [];
        const hasWall = pMonsters.some(m => m && !m.faceDown && this.canEquip(m));
        if (!hasWall) {
            return { canActivate: false, reason: "Solo se puede equipar a \\"Labyrinth Wall\\" en tu campo." };
        }
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const valid = [];
        (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
            if (m && !m.faceDown && this.canEquip(m)) valid.push({ playerKey, slotIndex: idx });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const p = duelState[playerKey];
        const targetMonster = (targetSlot !== undefined && p && p.monsters) ? p.monsters[targetSlot] : null;

        if (!targetMonster || !this.canEquip(targetMonster)) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Debe equiparse a "Labyrinth Wall".\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        // Tributar Labyrinth Wall equipado para Invocar Especial a Wall Shadow desde el Deck
        const shadowIdx = p.deck.findIndex(c => {
            const id = Number(c?.card_id || c?.id || c || 0);
            return id === 63162310 || (c?.name || '').toLowerCase().includes('wall shadow');
        });

        if (shadowIdx !== -1) {
            const shadowCard = p.deck.splice(shadowIdx, 1)[0];
            p.mainDeckCount = p.deck.length;
            p.monsters[targetSlot] = {
                id: 63162310,
                card_id: 63162310,
                name: "Wall Shadow",
                atk: 1600,
                def: 3000,
                position: 'ATK',
                faceDown: false,
                card_data: { id: 63162310, name: "Wall Shadow", type: "Effect Monster", atk: 1600, def: 3000, level: 7, race: "Warrior", attribute: "DARK" }
            };
            effectUtils.emitDuelLog(
                duelState.roomId,
                \`🌀✨ [\${this.name}] ¡Tributa "Labyrinth Wall" e Invoca de Modo Especial a "Wall Shadow" [ATK:1600/DEF:3000] desde el Deck!\`,
                'summon'
            );
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🌀✨ [\${this.name}] Equipado a "Labyrinth Wall".\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 22046459: Megamorph (Double ATK if LP < Opponent LP, Halve ATK if LP > Opponent LP)
CARDS[22046459] = `/**
 * [Passcode: 22046459] Megamorph
 * Tipo: Equip Spell | Expansión: MRL
 */
module.exports = {
    id: 22046459,
    name: "Megamorph",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    atkDelta: 0,
    defDelta: 0,

    canEquip(target, isOwnMonster = true) {
        return Boolean(target);
    },

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p1Monsters = duelState[playerKey]?.monsters || [];
        const p2Monsters = duelState[oppKey]?.monsters || [];
        const allMonsters = [...p1Monsters, ...p2Monsters];
        const hasValidMonster = allMonsters.some(m => m && !m.faceDown);
        if (!hasValidMonster) return { canActivate: false, reason: "No hay ningún monstruo boca arriba en el campo." };
        return { canActivate: true };
    },

    getValidTargets({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const valid = [];
        [playerKey, oppKey].forEach(pKey => {
            (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
            });
        });
        return valid;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const tPlayer = duelState[tPlayerKey];
        const targetMonster = (targetSlot !== undefined && tPlayer && tPlayer.monsters) ? tPlayer.monsters[targetSlot] : null;

        if (!targetMonster || targetMonster.faceDown) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [\${this.name}] Objetivo inválido o boca abajo.\`, 'spell');
            return { success: false, reason: "Objetivo inválido." };
        }

        const myLp = duelState[playerKey]?.lp || 8000;
        const oppLp = duelState[oppKey]?.lp || 8000;
        const origAtk = targetMonster.card_data ? (targetMonster.card_data.atk || 0) : (targetMonster.atk || 0);

        let delta = 0;
        if (myLp < oppLp) {
            delta = origAtk; // Duplica
        } else if (myLp > oppLp) {
            delta = -Math.floor(origAtk / 2); // Divide a la mitad
        }

        if (!targetMonster.attachedEffects) targetMonster.attachedEffects = [];
        targetMonster.attachedEffects.push({
            card_id: this.id,
            card_name: this.name,
            effect_type: 'EQUIP',
            atkDelta: delta,
            defDelta: 0,
            equippedBy: playerKey,
            isMegamorph: true
        });

        effectUtils.calculateMonsterCurrentStats(targetMonster, duelState, tPlayerKey);
        effectUtils.emitDuelLog(
            duelState.roomId,
            \`🧬✨ [\${this.name}] Equipado a "\${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}" (\${myLp < oppLp ? '¡ATK Duplicado!' : (myLp > oppLp ? '¡ATK Reducido a la mitad!' : 'Sin cambio de ATK')}).\`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// =========================================================================
// 2. FIELD SPELLS (7 Cartas)
// =========================================================================

const createFieldSpell = (id, name, element, atkBonus, defPenalty, desc) => `/**
 * [Passcode: ${id}] ${name}
 * Tipo: Field Spell | Expansión: MRL
 */
module.exports = {
    id: ${id},
    name: "${name}",
    type: "Field Spell",
    race: "Field",
    isField: true,
    targetAttribute: "${element}",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        p.fieldSpell = { id: this.id, name: this.name, type: this.type, targetAttribute: this.targetAttribute };

        // Recalcular estadísticas para todos los monstruos de ambos campos
        ['player1', 'player2'].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m) effectUtils.calculateMonsterCurrentStats(m, duelState, pk);
            });
        });

        effectUtils.emitDuelLog(duelState.roomId, \`🌐✨ [\${this.name}] ¡El Campo Mágico "${name}" se despliega en todo el terreno de duelo! (${desc})\`, 'field');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

CARDS[81380218] = createFieldSpell(81380218, "Chorus of Sanctuary", "ALL", 0, 500, "Todos los monstruos en Posición de Defensa ganan 500 DEF");
CARDS[56594520] = createFieldSpell(56594520, "Gaia Power", "EARTH", 500, -400, "Monstruos de TIERRA ganan 500 ATK y pierden 400 DEF");
CARDS[82999629] = createFieldSpell(82999629, "Umiiruka", "WATER", 500, -400, "Monstruos de AGUA ganan 500 ATK y pierden 400 DEF");
CARDS[19384334] = createFieldSpell(19384334, "Molten Destruction", "FIRE", 500, -400, "Monstruos de FUEGO ganan 500 ATK y pierden 400 DEF");
CARDS[45778932] = createFieldSpell(45778932, "Rising Air Current", "WIND", 500, -400, "Monstruos de VIENTO ganan 500 ATK y pierden 400 DEF");
CARDS[81777047] = createFieldSpell(81777047, "Luminous Spark", "LIGHT", 500, -400, "Monstruos de LUZ ganan 500 ATK y pierden 400 DEF");
CARDS[18161786] = createFieldSpell(18161786, "Mystic Plasma Zone", "DARK", 500, -400, "Monstruos de OSCURIDAD ganan 500 ATK y pierden 400 DEF");

// =========================================================================
// 3. CONTINUOUS SPELLS (5 Cartas)
// =========================================================================

// 16762927: Gravekeeper's Servant (Opponent must mill 1 card from Deck to declare attack)
CARDS[16762927] = `/**
 * [Passcode: 16762927] Gravekeeper's Servant
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 16762927,
    name: "Gravekeeper's Servant",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`📜✨ [\${this.name}] El adversario debe enviar la carta superior de su Deck al Cementerio para declarar ataques.\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 82003859: Toll (Both players must pay 500 LP to declare attack)
CARDS[82003859] = `/**
 * [Passcode: 82003859] Toll
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 82003859,
    name: "Toll",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`💰✨ [\${this.name}] ¡Peaje activo! Cada jugador debe pagar 500 LP para declarar un ataque con un monstruo.\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 79323590: Chain Energy (Pay 500 LP per card to Normal/Special Summon, Set, or activate from hand)
CARDS[79323590] = `/**
 * [Passcode: 79323590] Chain Energy
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 79323590,
    name: "Chain Energy",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`⚡✨ [\${this.name}] ¡Energía en Cadena activa! Cada jugador debe pagar 500 LP para Invocar, Colocar o activar cartas desde la mano.\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 15259703: Toon World (Pay 1000 LP)
CARDS[15259703] = `/**
 * [Passcode: 15259703] Toon World
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 15259703,
    name: "Toon World",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    isToonWorld: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (p && p.lp <= 1000) {
            return { canActivate: false, reason: "Se requieren más de 1000 LP para pagar el costo de \\"Toon World\\"." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        const cost = 1000;
        p.lp = Math.max(0, (p.lp || 8000) - cost);
        p.hasToonWorld = true;

        effectUtils.emitDuelLog(duelState.roomId, \`📖✨ [\${this.name}] \${p.username} paga \${cost} LP. ¡El legendario Mundo Toon se abre en el campo! (LP restantes: \${p.lp})\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 44656491: Messenger of Peace (Monsters with 1500+ ATK cannot attack. Pay 100 LP in Standby or destroy)
CARDS[44656491] = `/**
 * [Passcode: 44656491] Messenger of Peace
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 44656491,
    name: "Messenger of Peace",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    isMessengerOfPeace: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🕊️✨ [\${this.name}] ¡Mensajero de la Paz activo! Ningún monstruo con 1500 o más ATK puede declarar un ataque.\`, 'spell');
        return { success: true };
    },

    async onStandby(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p) {
            if (p.lp > 100) {
                p.lp -= 100;
                effectUtils.emitDuelLog(duelState.roomId, \`🕊️ [\${this.name}] Paga 100 LP de mantenimiento. (LP: \${p.lp})\`, 'cost');
            }
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// =========================================================================
// 4. NORMAL SPELLS (10 Cartas)
// =========================================================================

// 12470447: Curse of Fiend (Change battle positions during Standby Phase)
CARDS[12470447] = `/**
 * [Passcode: 12470447] Curse of Fiend
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 12470447,
    name: "Curse of Fiend",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let changed = 0;
        ['player1', 'player2'].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m && !m.faceDown) {
                    m.position = m.position === 'ATK' ? 'DEF' : 'ATK';
                    changed++;
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, \`👹✨ [\${this.name}] ¡Cambia la posición de batalla de \${changed} monstruos boca arriba en el campo!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 70368879: Upstart Goblin (Draw 1 card, opponent gains 1000 LP)
CARDS[70368879] = `/**
 * [Passcode: 70368879] Upstart Goblin
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 70368879,
    name: "Upstart Goblin",
    type: "Normal Spell",
    race: "Spell",
    isDrawCard: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length === 0) {
            return { canActivate: false, reason: "No tienes cartas en el Deck para robar." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        if (p.deck.length > 0) {
            const card = p.deck.pop();
            p.hand.push(card);
            p.mainDeckCount = p.deck.length;
        }

        if (opp) {
            opp.lp = (opp.lp || 8000) + 1000;
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            \`👺✨ [\${this.name}] ¡\${p.username} roba 1 carta de su Deck y \${opp ? opp.username : 'el rival'} gana 1000 LP! (LP rival: \${opp ? opp.lp : 9000})\`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 18591904: Final Destiny (Discard 5 cards, destroy all cards on field)
CARDS[18591904] = `/**
 * [Passcode: 18591904] Final Destiny
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 18591904,
    name: "Final Destiny",
    type: "Normal Spell",
    race: "Spell",
    isMonsterBoardWipe: true,
    isSpellTrapBoardWipe: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        // Requiere al menos 5 cartas para descartar (excluyendo a Final Destiny)
        if (!p || !p.hand || p.hand.length < 5) {
            return { canActivate: false, reason: "Se requieren al menos 5 cartas en la mano para pagar el costo de \\"Final Destiny\\"." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        // Descartar 5 cartas
        for (let i = 0; i < 5; i++) {
            if (p.hand.length > 0) {
                const c = p.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, c, playerKey);
            }
        }

        let destroyedCount = 0;
        ['player1', 'player2'].forEach(pk => {
            const playerObj = duelState[pk];
            if (playerObj) {
                for (let i = 0; i < 5; i++) {
                    if (playerObj.monsters[i]) {
                        effectUtils.sendCardToGraveyard(duelState, playerObj.monsters[i], pk);
                        playerObj.monsters[i] = null;
                        destroyedCount++;
                    }
                    if (playerObj.spells[i]) {
                        effectUtils.sendCardToGraveyard(duelState, playerObj.spells[i], pk);
                        playerObj.spells[i] = null;
                        destroyedCount++;
                    }
                }
                if (playerObj.fieldSpell) {
                    playerObj.fieldSpell = null;
                    destroyedCount++;
                }
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, \`☄️💥 [\${this.name}] ¡Destino Final! Descarta 5 cartas y destruye todas las cartas en el campo (\${destroyedCount} cartas destruidas).\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 17375316: Confiscation (Pay 1000 LP, look at opponent hand, discard 1)
CARDS[17375316] = `/**
 * [Passcode: 17375316] Confiscation
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 17375316,
    name: "Confiscation",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];
        if (!p || p.lp <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP para activar Confiscation." };
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        p.lp = Math.max(0, (p.lp || 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, \`💔 [\${this.name}] \${p.username} paga 1000 LP (LP: \${p.lp}).\`, 'cost');

        if (opp.hand.length > 0) {
            const cardIdx = targetData?.hand_index !== undefined ? targetData.hand_index : 0;
            const discarded = opp.hand.splice(cardIdx, 1)[0];
            effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
            effectUtils.emitDuelLog(duelState.roomId, \`👁️🗑️ [\${this.name}] ¡Confiscada "\${discarded.name || 'Carta'}" de la mano de \${opp.username} y enviada al Cementerio!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 44763025: Delinquent Duo (Pay 1000 LP, opponent discards 1 random, 1 choice)
CARDS[44763025] = `/**
 * [Passcode: 44763025] Delinquent Duo
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 44763025,
    name: "Delinquent Duo",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];
        if (!p || p.lp <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP para activar Delinquent Duo." };
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        p.lp = Math.max(0, (p.lp || 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, \`💔 [\${this.name}] \${p.username} paga 1000 LP (LP: \${p.lp}).\`, 'cost');

        let discardedCount = 0;
        const count = Math.min(2, opp.hand.length);
        for (let i = 0; i < count; i++) {
            if (opp.hand.length > 0) {
                const rand = Math.floor(Math.random() * opp.hand.length);
                const discarded = opp.hand.splice(rand, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
                discardedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`👥💥 [\${this.name}] ¡El rival descartó \${discardedCount} carta(s) de su mano al Cementerio!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 80168720: Darkness Approaches (Discard 2, change 1 monster to face-down DEF)
CARDS[80168720] = `/**
 * [Passcode: 80168720] Darkness Approaches
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 80168720,
    name: "Darkness Approaches",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hand || p.hand.length < 2) return { canActivate: false, reason: "Se requieren al menos 2 cartas en mano para descartar." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        for (let i = 0; i < 2; i++) {
            if (p.hand.length > 0) {
                const disc = p.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
            }
        }

        const tPlayerKey = targetData?.target_player || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[tSlot];

        if (targetMon) {
            targetMon.position = 'DEF';
            targetMon.faceDown = true;
            effectUtils.emitDuelLog(duelState.roomId, \`🌑✨ [\${this.name}] ¡"\${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" es puesto boca abajo en Posición de Defensa!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 42829885: The Forceful Sentry (Look at opponent hand, shuffle 1 into Deck)
CARDS[42829885] = `/**
 * [Passcode: 42829885] The Forceful Sentry
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 42829885,
    name: "The Forceful Sentry",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp.hand.length > 0) {
            const idx = targetData?.hand_index !== undefined ? targetData.hand_index : 0;
            const chosen = opp.hand.splice(idx, 1)[0];
            opp.deck.push(chosen);
            // Barajar
            for (let i = opp.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opp.deck[i], opp.deck[j]] = [opp.deck[j], opp.deck[i]];
            }
            opp.mainDeckCount = opp.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, \`👮✨ [\${this.name}] ¡"\${chosen.name || 'Carta'}" fue devuelta y barajada en el Deck del rival!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 42703248: Giant Trunade (Return all Spells and Traps on field to hand)
CARDS[42703248] = `/**
 * [Passcode: 42703248] Giant Trunade
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 42703248,
    name: "Giant Trunade",
    type: "Normal Spell",
    race: "Spell",
    isSpellTrapBoardWipe: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let returned = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    if (p.spells[i]) {
                        p.hand.push(p.spells[i]);
                        p.spells[i] = null;
                        returned++;
                    }
                }
                if (p.fieldSpell) {
                    p.hand.push(p.fieldSpell);
                    p.fieldSpell = null;
                    returned++;
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🌪️✨ [\${this.name}] ¡Tornado Gigante regresa \${returned} carta(s) Mágica(s)/Trampa(s) del campo a la mano!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 74191942: Painful Choice (Select 5 from Deck, opponent picks 1 to hand, rest to GY)
CARDS[74191942] = `/**
 * [Passcode: 74191942] Painful Choice
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 74191942,
    name: "Painful Choice",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length < 5) return { canActivate: false, reason: "Se requieren al menos 5 cartas en el Deck." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        if (p.deck.length >= 5) {
            // Extraer 5 cartas
            const picked = p.deck.splice(0, 5);
            // 1 va a la mano, 4 al cementerio
            const toHand = picked.shift();
            p.hand.push(toHand);
            picked.forEach(c => effectUtils.sendCardToGraveyard(duelState, c, playerKey));
            p.mainDeckCount = p.deck.length;

            effectUtils.emitDuelLog(duelState.roomId, \`⚖️✨ [\${this.name}] Elección Dolorosa: "\${toHand.name || 'Carta'}" fue añadida a la mano, y 4 cartas fueron enviadas al Cementerio.\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 95051344: Eternal Rest (Destroy all monsters equipped with Equip Cards)
CARDS[95051344] = `/**
 * [Passcode: 95051344] Eternal Rest
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 95051344,
    name: "Eternal Rest",
    type: "Normal Spell",
    race: "Spell",
    isMonsterRemoval: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let destroyed = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    const m = p.monsters[i];
                    if (m && m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'EQUIP')) {
                        effectUtils.sendCardToGraveyard(duelState, m, pk);
                        p.monsters[i] = null;
                        destroyed++;
                    }
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, \`🪦✨ [\${this.name}] ¡Descanso Eterno destruye \${destroyed} monstruo(s) equipado(s) en el campo!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// =========================================================================
// 5. QUICK-PLAY SPELLS (4 Cartas)
// =========================================================================

// 43641473: Tailor of the Fickle (Switch an Equip Card to another target)
CARDS[43641473] = `/**
 * [Passcode: 43641473] Tailor of the Fickle
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 43641473,
    name: "Tailor of the Fickle",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`✂️✨ [\${this.name}] ¡Sastre Voluble reubica una Carta de Equipo en otro objetivo válido!\`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 70046172: Rush Recklessly (1 monster gains 700 ATK until end of turn)
CARDS[70046172] = `/**
 * [Passcode: 70046172] Rush Recklessly
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 70046172,
    name: "Rush Recklessly",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "No hay monstruos boca arriba para aplicar el aumento." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[targetSlot];

        if (targetMon) {
            if (!targetMon.attachedEffects) targetMon.attachedEffects = [];
            targetMon.attachedEffects.push({
                card_id: this.id,
                card_name: this.name,
                atkDelta: 700,
                defDelta: 0,
                turnApplied: duelState.turnNumber
            });
            effectUtils.calculateMonsterCurrentStats(targetMon, duelState, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🐗⚡ [\${this.name}] ¡"\${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" gana +700 ATK hasta el final del turno!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 16430187: The Reliable Guardian (1 monster gains 700 DEF until end of turn)
CARDS[16430187] = `/**
 * [Passcode: 16430187] The Reliable Guardian
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 16430187,
    name: "The Reliable Guardian",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "No hay monstruos boca arriba para aplicar el aumento." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[targetSlot];

        if (targetMon) {
            if (!targetMon.attachedEffects) targetMon.attachedEffects = [];
            targetMon.attachedEffects.push({
                card_id: this.id,
                card_name: this.name,
                atkDelta: 0,
                defDelta: 700,
                turnApplied: duelState.turnNumber
            });
            effectUtils.calculateMonsterCurrentStats(targetMon, duelState, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🛡️⚡ [\${this.name}] ¡"\${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" gana +700 DEF hasta el final del turno!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 5318639: Mystical Space Typhoon (Destroy 1 Spell/Trap on field)
CARDS[5318639] = `/**
 * [Passcode: 5318639] Mystical Space Typhoon
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 5318639,
    name: "Mystical Space Typhoon",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,
    isSpellTrapRemoval: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasSpellTrap = ['player1', 'player2'].some(pk => {
            const p = duelState[pk];
            return p && (p.spells.some(s => s !== null) || p.fieldSpell !== null);
        });
        if (!hasSpellTrap) return { canActivate: false, reason: "No hay cartas Mágicas o de Trampa en el campo para destruir." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const tPlayer = duelState[tPlayerKey];

        if (tPlayer && tPlayer.spells && tPlayer.spells[targetSlot]) {
            const destroyed = tPlayer.spells[targetSlot];
            tPlayer.spells[targetSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🌪️✨ [\${this.name}] ¡Tifón del Espacio Místico destruye "\${destroyed.name || 'Carta'}"!\`, 'spell');
        } else if (tPlayer && tPlayer.fieldSpell) {
            const destroyed = tPlayer.fieldSpell;
            tPlayer.fieldSpell = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🌪️✨ [\${this.name}] ¡Tifón del Espacio Místico destruye el Campo Mágico "\${destroyed.name || 'Campo'}"!\`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// =========================================================================
// 6. TRAPS (Normal & Continuous: 5 Cartas)
// =========================================================================

// 18807108: Spellbinding Circle (Continuous Trap: Target cannot attack or change position)
CARDS[18807108] = `/**
 * [Passcode: 18807108] Spellbinding Circle
 * Tipo: Continuous Trap | Expansión: MRL
 */
module.exports = {
    id: 18807108,
    name: "Spellbinding Circle",
    type: "Continuous Trap",
    race: "Trap",
    isTrap: true,
    isContinuous: true,
    isTargetStun: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para paralizar." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const opp = duelState[oppKey];
        const targetMon = opp?.monsters[tSlot];

        if (targetMon) {
            targetMon.isTrapped = true;
            targetMon.cannotAttack = true;
            targetMon.cannotChangePosition = true;
            effectUtils.emitDuelLog(duelState.roomId, \`⭕⚡ [\${this.name}] ¡Círculo del Hechizo paraliza a "\${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}"! No puede atacar ni cambiar de posición.\`, 'trap');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 17653779: Fairy's Hand Mirror (Switch Spell target)
CARDS[17653779] = `/**
 * [Passcode: 17653779] Fairy's Hand Mirror
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 17653779,
    name: "Fairy's Hand Mirror",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, \`🪞⚡ [\${this.name}] ¡Espejo de Mano del Hada redirige el objetivo de la Carta Mágica!\`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 596051: Snake Fang (Target monster loses 500 DEF)
CARDS[596051] = `/**
 * [Passcode: 596051] Snake Fang
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 596051,
    name: "Snake Fang",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "No hay monstruos boca arriba para aplicar la reducción." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[targetSlot];

        if (targetMon) {
            if (!targetMon.attachedEffects) targetMon.attachedEffects = [];
            targetMon.attachedEffects.push({
                card_id: this.id,
                card_name: this.name,
                atkDelta: 0,
                defDelta: -500,
                turnApplied: duelState.turnNumber
            });
            effectUtils.calculateMonsterCurrentStats(targetMon, duelState, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🐍⚡ [\${this.name}] ¡Colmillo de Serpiente reduce en 500 la DEF de "\${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}"!\`, 'trap');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;

// 15083728: House of Adhesive Tape (Destroy summoned monster with DEF <= 500)
CARDS[15083728] = `/**
 * [Passcode: 15083728] House of Adhesive Tape
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 15083728,
    name: "House of Adhesive Tape",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const targetMon = targetData?.card || targetData?.monster;
        if (targetMon && (targetMon.def <= 500 || (targetMon.card_data && targetMon.card_data.def <= 500))) {
            const slot = targetData?.slotIndex !== undefined ? targetData.slotIndex : 0;
            if (duelState[oppKey]?.monsters[slot]) {
                effectUtils.sendCardToGraveyard(duelState, duelState[oppKey].monsters[slot], oppKey);
                duelState[oppKey].monsters[slot] = null;
                effectUtils.emitDuelLog(duelState.roomId, \`📦⚡ [\${this.name}] ¡Casa de Cinta Adhesiva destruye al monstruo recién invocado con 500 o menos DEF!\`, 'trap');
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

// 42578427: Eatgaboon (Destroy summoned monster with ATK <= 500)
CARDS[42578427] = `/**
 * [Passcode: 42578427] Eatgaboon
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 42578427,
    name: "Eatgaboon",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const targetMon = targetData?.card || targetData?.monster;
        if (targetMon && (targetMon.atk <= 500 || (targetMon.card_data && targetMon.card_data.atk <= 500))) {
            const slot = targetData?.slotIndex !== undefined ? targetData.slotIndex : 0;
            if (duelState[oppKey]?.monsters[slot]) {
                effectUtils.sendCardToGraveyard(duelState, duelState[oppKey].monsters[slot], oppKey);
                duelState[oppKey].monsters[slot] = null;
                effectUtils.emitDuelLog(duelState.roomId, \`🐊⚡ [\${this.name}] ¡Eatgaboon devora y destruye al monstruo recién invocado con 500 o menos ATK!\`, 'trap');
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

// =========================================================================
// ESCRIBIR TODOS LOS ARCHIVOS DEL BATCH 1
// =========================================================================

let count = 0;
for (const [id, code] of Object.entries(CARDS)) {
    const filePath = path.join(outDir, `c${id}.js`);
    fs.writeFileSync(filePath, code.trim() + '\n', 'utf8');
    count++;
}

console.log(`✅ [BATCH 1 COMPLETADO] Escritas exitosamente ${count} cartas Mágicas y de Trampa en ${outDir}`);
