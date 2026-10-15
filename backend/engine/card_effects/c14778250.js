/**
 * [Passcode: 14778250] The Tricky
 * Tipo: Effect Monster
 * Arquetipo / Expansión: TDGS
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 14778250,
    name: "The Tricky",
    type: "Effect Monster",
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

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
