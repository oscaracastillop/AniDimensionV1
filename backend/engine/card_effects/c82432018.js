/**
 * [Passcode: 82432018] Mask of Brutality
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 82432018,
    name: "Mask of Brutality",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) { return Boolean(target); },

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

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 1000;
            target.currentDef = Math.max(0, (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) - 1000);
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🎭👹 [Mask of Brutality] ¡Equipada a "${target.card_data?.name || 'Monstruo'}"! (+1000 ATK / -1000 DEF). Costo: 1000 LP en cada una de tus Standby Phases.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
