/**
 * [Passcode: 3027001] Fake Trap
 * Tipo: Normal Trap
 */
module.exports = {
    id: 3027001,
    name: "Fake Trap",
    type: "Normal Trap",
    race: "Trap",
    
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        effectUtils.emitDuelLog(duelState.roomId, `🪤 [Fake Trap] ¡Trampa Falsa absorbe la destrucción de las cartas de Trampa!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
