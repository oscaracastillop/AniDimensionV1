/**
 * [Passcode: 55144522] Pot of Greed (Olla de la Codicia)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Draw 2 cards.
 */
module.exports = {
    id: 55144522,
    name: "Pot of Greed",
    type: "Normal Spell",
    race: "Spell",
    isDrawCard: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length < 2) {
            return { canActivate: false, reason: "No tienes al menos 2 cartas en tu Deck para robar." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length < 2) {
            return { success: false, reason: "Cartas insuficientes en el Deck." };
        }

        const drawn1 = p.deck.shift();
        const drawn2 = p.deck.shift();
        if (!p.hand) p.hand = [];
        p.hand.push(drawn1, drawn2);
        p.deckCount = p.deck.length;

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🏺✨ [Pot of Greed] ¡${p.username || playerKey} roba 2 cartas de su Deck!`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
