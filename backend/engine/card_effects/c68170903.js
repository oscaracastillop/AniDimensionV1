/**
 * [Passcode: 68170903] A Feint Plan
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 68170903,
    name: "A Feint Plan",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.feintPlanActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🎭 [A Feint Plan] Durante este turno, el rival no puede atacar a monstruos boca abajo.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
