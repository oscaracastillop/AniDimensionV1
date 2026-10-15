/**
 * [Passcode: 7089711] Hane-Hane (Hane-Hane)
 * Tipo: Flip Effect Monster | Expansión: LOB
 * Descripción Oficial: FLIP: Target 1 monster on the field; return that target to the hand.
 */
module.exports = {
    id: 7089711,
    name: "Hane-Hane",
    type: "Flip Effect Monster",
    atk: 450,
    def: 500,
    level: 2,
    race: "Beast",
    isFlip: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: false, reason: "Los efectos de Volteo se activan automáticamente al voltear la carta boca arriba." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        let targetMon = null;
        let targetOwner = oppKey;
        let targetSlot = -1;

        if (targetData && targetData.slot_index !== undefined) {
            targetOwner = targetData.target_player || oppKey;
            targetSlot = targetData.slot_index;
            targetMon = duelState[targetOwner]?.monsters?.[targetSlot];
        }

        if (!targetMon) {
            let maxAtk = -1;
            const oppMons = duelState[oppKey]?.monsters || [];
            oppMons.forEach((m, idx) => {
                if (m) {
                    const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                    if (atk > maxAtk) {
                        maxAtk = atk;
                        targetSlot = idx;
                        targetMon = m;
                        targetOwner = oppKey;
                    }
                }
            });
        }

        if (targetMon && targetSlot !== -1) {
            const tName = targetMon.card_data?.name || targetMon.name || 'Monstruo';
            effectUtils.cleanAttachedEquipsAndContinuousEffects(duelState, targetMon, targetOwner);
            duelState[targetOwner].monsters[targetSlot] = null;

            if (!duelState[targetOwner].hand) duelState[targetOwner].hand = [];
            duelState[targetOwner].hand.push(targetMon.card_data || targetMon);

            effectUtils.emitDuelLog(
                duelState.roomId,
                `💨🎴 [Hane-Hane] ¡Devuelve a "${tName}" a la mano de su dueño!`,
                'flip'
            );
            return { success: true };
        }

        effectUtils.emitDuelLog(duelState.roomId, `💨 [Hane-Hane] No hay monstruos en el campo para devolver a la mano.`, 'flip');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
