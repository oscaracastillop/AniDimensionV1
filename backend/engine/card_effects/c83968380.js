/**
 * [Passcode: 83968380] Jar of Greed
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 83968380,
    name: "Jar of Greed",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            if ((duelState[playerKey]?.deck || []).length === 0) return { canActivate: false, reason: "Deck vacío." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.deck.length > 0) {
                p.hand.push(p.deck.pop());
                effectUtils.emitDuelLog(duelState.roomId, `🏺🃏 [Jar of Greed] ¡Jarra de la Codicia! ${p.username} roba 1 carta del Deck.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
