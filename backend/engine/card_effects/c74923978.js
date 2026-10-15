/**
 * [Passcode: 74923978] Forced Requisition
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 74923978,
    name: "Forced Requisition",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📦⚖️ [Forced Requisition] ¡Activa! Siempre que descartes cartas de tu mano, el rival deberá descartar el mismo número.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
