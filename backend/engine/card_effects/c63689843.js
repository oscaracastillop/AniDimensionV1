/**
 * [Passcode: 63689843] Attack and Receive
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 63689843,
    name: "Attack and Receive",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const copiesInGY = (duelState[playerKey]?.graveyard || []).filter(c => Number(c.card_id || c.id) === 63689843).length;
            const dmg = 700 + (copiesInGY * 300);
            duelState[oppKey].lp = Math.max(0, (duelState[oppKey].lp || 8000) - dmg);
            effectUtils.emitDuelLog(duelState.roomId, `⚡💥 [Attack and Receive] ¡Contraataque de daño! Inflige ${dmg} puntos de daño a ${duelState[oppKey].username}. (LP: ${duelState[oppKey].lp})`, 'damage');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
