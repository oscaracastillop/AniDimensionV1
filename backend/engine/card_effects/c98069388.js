/**
 * [Passcode: 98069388] Horn of Heaven
 * Tipo: Counter Trap
 */
module.exports = {
    id: 98069388,
    name: "Horn of Heaven",
    type: "Counter Trap",
    race: "Trap",
    isCounter: true,
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const myMonSlot = (duelState[playerKey]?.monsters || []).findIndex(m => m !== null);
        if (myMonSlot !== -1) {
            const tMon = duelState[playerKey].monsters[myMonSlot];
            duelState[playerKey].monsters[myMonSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
        }
        if (duelState.pendingAction) {
            duelState.pendingAction.negated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🎺⚡ [Horn of Heaven] ¡Sacrifica 1 monstruo para anular la Invocación enemiga!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
