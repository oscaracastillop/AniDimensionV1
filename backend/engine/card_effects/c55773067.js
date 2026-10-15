/**
 * [Passcode: 55773067] Drop Off
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 55773067,
    name: "Drop Off",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        },

    async onOpponentDraw(context) {
            const { duelState, opponentKey, drawnCard, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp?.hand && opp.hand.length > 0) {
                const card = drawnCard || opp.hand.pop();
                effectUtils.sendCardToGraveyard(duelState, card, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `📭💥 [Drop Off] ¡El rival roba en su Draw Phase! Descarta inmediatamente la carta robada ("${card.name || card.card_data?.name}") al Cementerio.`, 'trap');
                return { success: true };
            }
            return { success: false };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
