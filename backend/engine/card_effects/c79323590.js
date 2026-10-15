/**
 * [Passcode: 79323590] Chain Energy
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 79323590,
    name: "Chain Energy",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚡✨ [${this.name}] ¡Energía en Cadena activa! Cada jugador debe pagar 500 LP para Invocar, Colocar o activar cartas desde la mano.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
