/**
 * [Passcode: 30170981] Spirit Message "L"
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 30170981,
    name: "Spirit Message \"L\"",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "L"] Letra "L" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
