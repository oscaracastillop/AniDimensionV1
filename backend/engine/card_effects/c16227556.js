/**
 * [Passcode: 16227556] Inspection
 * Tipo: Continuous Spell | Expansión: PSV
 */
module.exports = {
    id: 16227556,
    name: "Inspection",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔍 [Inspection] ¡Activada! Durante la Standby Phase del rival puedes pagar 500 LP para ver 1 carta al azar de su mano.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
