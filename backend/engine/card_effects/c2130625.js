/**
 * [Passcode: 2130625] Numinous Healer
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 2130625,
    name: "Numinous Healer",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState }) { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + 2000;
            effectUtils.emitDuelLog(duelState.roomId, `✨💖 [Numinous Healer] ¡Sanador Numíneo restaura 2000 Life Points! (LP: ${duelState[playerKey].lp})`, 'heal');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
