/**
 * [Passcode: 8951260] Respect Play
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 8951260,
    name: "Respect Play",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.respectPlayActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🤝🎴 [Respect Play] ¡Juego con Respeto activo! Ambos duelistas juegan mostrando sus manos.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
