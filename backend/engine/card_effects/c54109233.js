/**
 * [Passcode: 54109233] Infinite Dismissal
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 54109233,
    name: "Infinite Dismissal",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.infiniteDismissalActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🚪⚡ [Infinite Dismissal] Todos los monstruos de Nivel 3 o menor serán destruidos en la End Phase del turno en que sean invocados.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
