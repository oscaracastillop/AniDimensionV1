/**
 * [Passcode: 21237481] Type Zero Magic Crusher
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 21237481,
    name: "Type Zero Magic Crusher",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const hasSpell = (duelState[playerKey]?.hand || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (!hasSpell) return { canActivate: false, reason: "Debes tener al menos 1 Carta Mágica en mano para descartar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const sIdx = (p?.hand || []).findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (sIdx !== -1) {
                const [discarded] = p.hand.splice(sIdx, 1);
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                opp.lp = Math.max(0, (opp.lp || 8000) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `⚙️💥 [Type Zero Magic Crusher] Descarta "${discarded.card_data?.name || 'Magia'}" e inflige 500 de daño a ${opp.username}. (LP: ${opp.lp})`, 'damage');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
