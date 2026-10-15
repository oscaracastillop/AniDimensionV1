/**
 * [Passcode: 74191942] Painful Choice
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 74191942,
    name: "Painful Choice",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length < 5) return { canActivate: false, reason: "Se requieren al menos 5 cartas en el Deck." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p = duelState[playerKey];
        if (p.deck.length >= 5) {
            // Extraer 5 cartas
            const picked = p.deck.splice(0, 5);
            // 1 va a la mano, 4 al cementerio
            const toHand = picked.shift();
            p.hand.push(toHand);
            picked.forEach(c => effectUtils.sendCardToGraveyard(duelState, c, playerKey));
            p.mainDeckCount = p.deck.length;

            effectUtils.emitDuelLog(duelState.roomId, `⚖️✨ [${this.name}] Elección Dolorosa: "${toHand.name || 'Carta'}" fue añadida a la mano, y 4 cartas fueron enviadas al Cementerio.`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
