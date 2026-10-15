/**
 * [Passcode: 82003859] Toll
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 82003859,
    name: "Toll",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `💰✨ [${this.name}] ¡Peaje activo! Cada jugador debe pagar 500 LP para declarar un ataque con un monstruo.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
