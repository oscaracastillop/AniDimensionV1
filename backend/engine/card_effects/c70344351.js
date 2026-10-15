/**
 * [Passcode: 70344351] Riryoku Field
 * Tipo: Counter Trap | Expansión: LON
 */
module.exports = {
    id: 70344351,
    name: "Riryoku Field",
    type: "Counter Trap",
    race: "Trap",
    isTrap: true,
    isCounter: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️⚡ [Riryoku Field] ¡Campo de Riryoku niega la Carta Mágica que seleccionó a un monstruo como objetivo y la destruye!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
