/**
 * [Passcode: 46918794] Tremendous Fire
 * Tipo: Normal Spell
 */
module.exports = {
    id: 46918794,
    name: "Tremendous Fire",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        duelState[opponentKey].lp = Math.max(0, (duelState[opponentKey].lp || 8000) - 1000);
        duelState[playerKey].lp = Math.max(0, (duelState[playerKey].lp || 8000) - 500);
        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Tremendous Fire] ¡Fuego abrasador inflige 1000 de daño a ${duelState[opponentKey].username} y 500 a ${duelState[playerKey].username}!`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
