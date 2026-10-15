/**
 * [Passcode: 19827717] Return of the Doomed
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 19827717,
    name: "Return of the Doomed",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const hasHand = (duelState[playerKey]?.hand || []).length > 0;
            if (!hasHand) return { canActivate: false, reason: "Debes descartar 1 carta de tu mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.hand.length > 0) {
                const [disc] = p.hand.splice(0, 1);
                effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
            }
            duelState.returnOfTheDoomedActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `💀🔄 [Return of the Doomed] Descarta 1 carta. Si tu monstruo es destruido en batalla este turno, regresará a tu mano al final del turno.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
