/**
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
            return { canActivate: false, reason: "Solo se puede equipar a \"Labyrinth Wall\" en tu campo." };
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
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [${this.name}] Debe equiparse a "Labyrinth Wall".`, 'spell');
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
                `🌀✨ [${this.name}] ¡Tributa "Labyrinth Wall" e Invoca de Modo Especial a "Wall Shadow" [ATK:1600/DEF:3000] desde el Deck!`,
                'summon'
            );
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `🌀✨ [${this.name}] Equipado a "Labyrinth Wall".`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
