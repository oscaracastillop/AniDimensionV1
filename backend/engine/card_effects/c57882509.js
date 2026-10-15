/**
 * [Passcode: 57882509] Mask of Weakness
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 57882509,
    name: "Mask of Weakness",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasAttacker = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasAttacker) return { canActivate: false, reason: "No hay monstruos atacantes." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp?.monsters || []).findIndex(m => m && !m.faceDown);
            const target = opp?.monsters?.[tSlot];
            if (target) {
                target.currentAtk = Math.max(0, (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) - 700);
                effectUtils.emitDuelLog(duelState.roomId, `🎭📉 [Mask of Weakness] ¡Máscara de Debilidad reduce el ATK de "${target.card_data?.name || 'Monstruo'}" en 700 puntos!`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
