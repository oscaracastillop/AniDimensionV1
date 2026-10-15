/**
 * [Passcode: 59344077] Magic Drain
 * Tipo: Counter Trap | Expansión: PSV
 */
module.exports = {
    id: 59344077,
    name: "Magic Drain",
    type: "Counter Trap",
    race: "Trap",
    isTrap: true,
    isCounter: true,

    canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const oppSpellIdx = (opp?.hand || []).findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));

            if (oppSpellIdx !== -1) {
                const [discarded] = opp.hand.splice(oppSpellIdx, 1);
                effectUtils.sendCardToGraveyard(duelState, discarded, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `💧📜 [Magic Drain] El rival descarta "${discarded.card_data?.name || 'Magia'}" para cancelar la anulación.`, 'spell');
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `💧🚫 [Magic Drain] ¡El rival no tiene Magias para descartar! Su carta Mágica es negada y destruida.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
