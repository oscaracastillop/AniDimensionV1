/**
 * [Passcode: 24623598] Disappear
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 24623598,
    name: "Disappear",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (!opp?.graveyard || opp.graveyard.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en su Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                const removed = opp.graveyard.pop();
                opp.banished.push(removed);
                effectUtils.emitDuelLog(duelState.roomId, `💨✨ [Disappear] Destierra "${removed.name || removed.card_data?.name}" del Cementerio de ${opp.username}.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
