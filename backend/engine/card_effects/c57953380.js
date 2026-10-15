/**
 * [Passcode: 57953380] Card of Safe Return
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 57953380,
    name: "Card of Safe Return",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.cardOfSafeReturnActive = duelState.cardOfSafeReturnActive || {};
            duelState.cardOfSafeReturnActive[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `🎴✨ [Card of Safe Return] ¡Carta del Retorno Seguro activa! Robarás 1 carta cada vez que un monstruo sea Invocado de Modo Especial desde tu Cementerio.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
