/**
 * [Passcode: 88279736] Robbin' Goblin
 * Tipo: Continuous Trap
 */
module.exports = {
    id: 88279736,
    name: "Robbin' Goblin",
    type: "Continuous Trap",
    race: "Trap",
    
    
    isContinuous: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const sIdx = duelState[playerKey].spells.findIndex(s => s && Number(s.card_id || s.card_data?.id) === this.id);
        if (sIdx !== -1) {
            duelState[playerKey].spells[sIdx].robbinGoblinActive = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `👺 [Robbin' Goblin] ¡Cada vez que inflijas daño de batalla, el rival descartará 1 carta al azar!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
