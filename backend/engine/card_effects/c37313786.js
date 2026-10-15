/**
 * [Passcode: 37313786] Gamble
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 37313786,
    name: "Gamble",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const oppHand = duelState[oppKey]?.hand?.length || 0;
            const myHand = duelState[playerKey]?.hand?.length || 0;
            if (oppHand < 6 || myHand > 1) {
                return { canActivate: false, reason: "El rival debe tener 6 o más cartas en mano y tú 1 o menos." };
            }
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const coin = Math.random() < 0.5 ? 'CARA' : 'CRUZ';
            const winnerKey = coin === 'CARA' ? playerKey : opponentKey;
            const winner = duelState[winnerKey];
            for (let i = 0; i < 5; i++) {
                if (winner.deck.length > 0) winner.hand.push(winner.deck.pop());
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪙🎲 [Gamble] Resultado de la moneda: ¡${coin}! ${winner.username} roba 5 cartas del Deck.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
