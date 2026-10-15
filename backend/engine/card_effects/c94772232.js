/**
 * [Passcode: 94772232] Spirit Message "A"
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 94772232,
    name: "Spirit Message \"A\"",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "A"] Letra "A" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
