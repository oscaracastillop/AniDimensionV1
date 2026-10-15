/**
 * [Passcode: 61740673] Imperial Order
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 61740673,
    name: "Imperial Order",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,
    isImperialOrder: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.spellsNegated = true;
            duelState.imperialOrderActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Imperial Order] ¡Decreto Imperial activo! Se anulan todos los efectos de Cartas Mágicas en el campo. Mantenimiento: 700 LP en cada Standby Phase.`, 'trap');
            return { success: true };
        },

    onStandby({ duelState, playerKey, effectUtils }) {
            const p = duelState[playerKey];
            if (p && p.lp > 700) {
                p.lp -= 700;
                effectUtils.emitDuelLog(duelState.roomId, `👑 [Imperial Order] ${p.username} paga 700 LP para mantener Imperial Order. (LP: ${p.lp})`, 'trap');
            } else if (p) {
                // Si no puede pagar, se destruye
                effectUtils.emitDuelLog(duelState.roomId, `👑💥 [Imperial Order] No se puede pagar el costo de 700 LP. Imperial Order es destruida.`, 'trap');
                duelState.spellsNegated = false;
                duelState.imperialOrderActive = false;
            }
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
