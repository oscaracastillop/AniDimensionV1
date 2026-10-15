/**
 * [Passcode: 17375316] Confiscation
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 17375316,
    name: "Confiscation",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];
        if (!p || p.lp <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP para activar Confiscation." };
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        p.lp = Math.max(0, (p.lp || 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, `💔 [${this.name}] ${p.username} paga 1000 LP (LP: ${p.lp}).`, 'cost');

        if (opp.hand.length > 0) {
            const cardIdx = targetData?.hand_index !== undefined ? targetData.hand_index : 0;
            const discarded = opp.hand.splice(cardIdx, 1)[0];
            effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
            effectUtils.emitDuelLog(duelState.roomId, `👁️🗑️ [${this.name}] ¡Confiscada "${discarded.name || 'Carta'}" de la mano de ${opp.username} y enviada al Cementerio!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
