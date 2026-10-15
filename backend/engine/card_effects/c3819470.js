/**
 * [Passcode: 3819470] Seven Tools of the Bandit
 * Tipo: Counter Trap
 */
module.exports = {
    id: 3819470,
    name: "Seven Tools of the Bandit",
    type: "Counter Trap",
    race: "Trap",
    isCounter: true,
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        duelState[playerKey].lp = Math.max(0, (duelState[playerKey].lp || 8000) - 1000);
        if (duelState.pendingAction) {
            duelState.pendingAction.negated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🧰⚡ [Seven Tools of the Bandit] ¡Paga 1000 LP para desactivar y destruir la Carta de Trampa activada!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
