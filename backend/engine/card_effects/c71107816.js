module.exports = {
    id: 71107816,
    name: "The Bistro Butcher",
    type: "Effect Monster",
    atk: 1800, def: 1000, level: 4, race: "Fiend",

    async onBattleDamage(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.hand = opp.hand || [];
        opp.deck = opp.deck || [];
        const drawCount = Math.min(2, opp.deck.length);
        for (let i = 0; i < drawCount; i++) {
            opp.hand.push(opp.deck.pop());
        }
        effectUtils.emitDuelLog(duelState.roomId, `🥩🍽️ [The Bistro Butcher] ¡Festín macabro! Inflige daño de batalla y hace que el rival robe ${drawCount} cartas.`, 'monster');
        return { success: true, drawn: drawCount };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleDamage({ duelState, opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
