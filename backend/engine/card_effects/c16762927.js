/**
 * [Passcode: 16762927] Gravekeeper's Servant
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 16762927,
    name: "Gravekeeper's Servant",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `📜✨ [${this.name}] El adversario debe enviar la carta superior de su Deck al Cementerio para declarar ataques.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
