/**
 * [Passcode: 9074847] Major Riot
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 9074847,
    name: "Major Riot",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `📢💥 [Major Riot] ¡Motín Masivo en el campo tras la devolución del monstruo!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
