/**
 * [Passcode: 27911549] Parasite Paracide
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 27911549,
    name: "Parasite Paracide",
    type: "Flip Effect Monster",
    atk: 500,
    def: 300,
    level: 2,
    race: "Insect",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp && opp.deck) {
                // Se baraja boca arriba en el Deck del oponente
                opp.deck.push({ id: 27911549, card_id: 27911549, name: "Parasite Paracide", faceUpInDeck: true });
                opp.deck.sort(() => Math.random() - 0.5);
                effectUtils.emitDuelLog(duelState.roomId, `🐛 [Parasite Paracide] ¡EFECTO DE VOLTEO! Se baraja boca arriba en el Deck de ${opp.username}. Al robarse infligirá 1000 de daño y convertirá sus monstruos en Insectos.`, 'flip');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
