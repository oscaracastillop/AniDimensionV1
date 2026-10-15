/**
 * [Passcode: 42829885] The Forceful Sentry
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 42829885,
    name: "The Forceful Sentry",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp.hand.length > 0) {
            const idx = targetData?.hand_index !== undefined ? targetData.hand_index : 0;
            const chosen = opp.hand.splice(idx, 1)[0];
            opp.deck.push(chosen);
            // Barajar
            for (let i = opp.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opp.deck[i], opp.deck[j]] = [opp.deck[j], opp.deck[i]];
            }
            opp.mainDeckCount = opp.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, `👮✨ [${this.name}] ¡"${chosen.name || 'Carta'}" fue devuelta y barajada en el Deck del rival!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
