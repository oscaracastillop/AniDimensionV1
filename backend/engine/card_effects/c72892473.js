/**
 * [Passcode: 72892473] Card Destruction (Destrucción de la Carta)
 * Tipo: Normal Spell
 * Regla Oficial OCG:
 * Ambos jugadores descartan tantas cartas como sea posible de sus manos al Cementerio,
 * y después cada jugador roba el mismo número de cartas que descartó de su respectivo Deck.
 */
module.exports = {
    id: 72892473,
    name: "Card Destruction",
    type: "Normal Spell",
    race: "Spell",

    canActivate(duelState, playerKey, opponentKey) {
        const p1 = duelState[playerKey];
        const p2 = duelState[opponentKey];
        if (!p1 || !p2) return false;
        const p1Hand = (p1.hand || []).length;
        const p2Hand = (p2.hand || []).length;
        if (p1Hand === 0 && p2Hand === 0) return false;
        if (p1.deck && p1Hand > p1.deck.length) return false;
        if (p2.deck && p2Hand > p2.deck.length) return false;
        return true;
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const p1 = duelState[playerKey];
        const p2 = duelState[opponentKey];
        if (!p1 || !p2) return { success: false };

        const p1HandCards = [...(p1.hand || [])];
        const p2HandCards = [...(p2.hand || [])];
        const p1Count = p1HandCards.length;
        const p2Count = p2HandCards.length;

        // 1. Ambos jugadores descartan sus manos enteras al Cementerio
        p1.hand = [];
        p1HandCards.forEach(c => effectUtils.sendCardToGraveyard(duelState, c, playerKey));

        p2.hand = [];
        p2HandCards.forEach(c => effectUtils.sendCardToGraveyard(duelState, c, opponentKey));

        // 2. Cada jugador roba exactamente el número de cartas que descartó
        let p1Drawn = 0;
        for (let i = 0; i < p1Count; i++) {
            if (p1.deck && p1.deck.length > 0) {
                p1.hand.push(p1.deck.pop());
                p1Drawn++;
            }
        }
        p1.mainDeckCount = (p1.deck || []).length;

        let p2Drawn = 0;
        for (let i = 0; i < p2Count; i++) {
            if (p2.deck && p2.deck.length > 0) {
                p2.hand.push(p2.deck.pop());
                p2Drawn++;
            }
        }
        p2.mainDeckCount = (p2.deck || []).length;

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🃏💥 [Card Destruction] ${p1.username} descartó ${p1Count} y robó ${p1Drawn} carta(s). ${p2.username} descartó ${p2Count} y robó ${p2Drawn} carta(s).`,
            'spell'
        );

        return { success: true, p1Discarded: p1Count, p2Discarded: p2Count, p1Drawn, p2Drawn };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
