/**
 * [Passcode: 82099401] Crystal Seer
 * Tipo: Effect
 * Arquetipo / Expansión: TAEV
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 82099401,
    name: "Crystal Seer",
    type: "Effect",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.hand = opp.hand || [];
        opp.graveyard = opp.graveyard || [];
        let discarded = null;
        if (opp.hand.length > 0) {
            discarded = opp.hand.pop();
            effectUtils.sendCardToGraveyard(duelState, discarded, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗑️ [${this.name}] ¡Hace descartar 1 carta de la mano rival (${discarded.name || 'Carta'}) al cementerio!`, 'discard');
            return { success: true, discarded: discarded.name };
        }
        return { success: true };
    },

    async onFlip(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
