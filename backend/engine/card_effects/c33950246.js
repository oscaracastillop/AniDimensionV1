/**
 * [Passcode: 33950246] Royal Command
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 33950246,
    name: "Royal Command",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.flipEffectsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Royal Command] ¡Orden Real activa! Todos los Efectos de Volteo quedan completamente anulados.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
