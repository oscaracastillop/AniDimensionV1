/**
 * [Passcode: 83746708] Mage Power
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 83746708,
    name: "Mage Power",
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

            const stCount = (duelState[playerKey]?.spells || []).filter(s => s).length + (duelState[playerKey]?.fieldSpell ? 1 : 0);
            const bonus = stCount * 500;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + bonus;
            target.currentDef = (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) + bonus;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🧙⚡ [Mage Power] ¡Poder de Mago equipado a "${target.card_data?.name || 'Monstruo'}"! (+${bonus} ATK/DEF por ${stCount} Mágica(s)/Trampa(s) que controlas).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
