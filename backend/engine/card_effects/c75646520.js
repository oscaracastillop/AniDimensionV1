/**
 * [Passcode: 75646520] Metal Detector
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 75646520,
    name: "Metal Detector",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📟 [Metal Detector] Todas las Cartas de Trampa Continuas quedan sin efecto durante este turno.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
