/**
 * [Passcode: 69832741] Spirit Elimination
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 69832741,
    name: "Spirit Elimination",
    type: "Normal Spell",
    race: "Spell",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.spiritEliminationActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `👻🚫 [Spirit Elimination] Este turno, los monstruos en tu campo se desterrarán en lugar de los del Cementerio para costes de destierro.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
