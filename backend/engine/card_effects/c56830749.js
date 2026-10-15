/**
 * [Passcode: 56830749] Share the Pain
 * Tipo: Normal Spell
 */
module.exports = {
    id: 56830749,
    name: "Share the Pain",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const myMonSlot = duelState[playerKey].monsters.findIndex(m => m !== null);
        const oppMonSlot = duelState[opponentKey].monsters.findIndex(m => m !== null);
        if (myMonSlot !== -1 && oppMonSlot !== -1) {
            const myM = duelState[playerKey].monsters[myMonSlot];
            const oppM = duelState[opponentKey].monsters[oppMonSlot];
            duelState[playerKey].monsters[myMonSlot] = null;
            duelState[opponentKey].monsters[oppMonSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, myM, playerKey);
            effectUtils.sendCardToGraveyard(duelState, oppM, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `⚔️💥 [Share the Pain] ¡Ambos jugadores tributan 1 monstruo al cementerio!`, 'spell');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚔️ [Share the Pain] Ambos jugadores deben controlar al menos 1 monstruo.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
