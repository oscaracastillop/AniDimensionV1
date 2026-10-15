/**
 * [Passcode: 49251811] Mystic Probe
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 49251811,
    name: "Mystic Probe",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮 [Mystic Probe] Todas las Cartas Mágicas Continuas quedan sin efecto durante este turno.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
