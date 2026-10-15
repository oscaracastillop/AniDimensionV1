/**
 * [Passcode: 92394653] Spirit's Invitation
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 92394653,
    name: "Spirit's Invitation",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻 [Spirit's Invitation] Trampa continua activa: Cada vez que un monstruo Spirit regrese a tu mano, puedes regresar 1 monstruo rival a la mano.`, 'trap');
            return { success: true };
        },

    async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 500) {
                p.lifePoints -= 500;
                effectUtils.emitDuelLog(duelState.roomId, `👻🕯️ [Spirit's Invitation] Paga 500 LP de mantenimiento obligatorio (LP: ${p.lifePoints}).`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
