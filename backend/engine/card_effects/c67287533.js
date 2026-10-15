/**
 * [Passcode: 67287533] Spirit Message "N"
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 67287533,
    name: "Spirit Message \"N\"",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "N"] Letra "N" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
