/**
 * [Passcode: 36562627] Second Coin Toss
 * Tipo: Continuous Spell | Expansión: LOD
 */
module.exports = {
    id: 36562627,
    name: "Second Coin Toss",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🪙✨ [Second Coin Toss] Magia continua activa: Puedes repetir 1 lanzamiento de moneda una vez por turno.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
