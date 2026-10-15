/**
 * [Passcode: 68400115] The Emperor's Holiday
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 68400115,
    name: "The Emperor's Holiday",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.equipSpellsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `🏖️👑 [The Emperor's Holiday] ¡Vacaciones del Emperador activas! Se anulan todos los efectos de las Cartas Mágicas de Equipo en el campo.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
