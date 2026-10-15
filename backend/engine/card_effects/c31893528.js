/**
 * [Passcode: 31893528] Spirit Message "I"
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 31893528,
    name: "Spirit Message \"I\"",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "I"] Letra "I" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
