/**
 * [Passcode: 41420027] Solemn Judgment
 * Tipo: Counter Trap
 */
module.exports = {
    id: 41420027,
    name: "Solemn Judgment",
    type: "Counter Trap",
    race: "Trap",
    isCounter: true,
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const cost = Math.floor((duelState[playerKey].lp || 8000) / 2);
        duelState[playerKey].lp = Math.max(1, duelState[playerKey].lp - cost);
        if (duelState.pendingAction) {
            duelState.pendingAction.negated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚖️⚡ [Solemn Judgment] ¡Paga ${cost} LP (la mitad) para negar solemnemente y destruir la carta activada!`, 'trap');
        return { success: true, cost };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
