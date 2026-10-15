/**
 * [Passcode: 77414722] Magic Jammer
 * Tipo: Counter Trap
 */
module.exports = {
    id: 77414722,
    name: "Magic Jammer",
    type: "Counter Trap",
    race: "Trap",
    isCounter: true,
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const p = duelState[playerKey];
        if (p.hand && p.hand.length > 0) {
            const disc = p.hand.pop();
            effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
        }
        if (duelState.pendingAction) {
            duelState.pendingAction.negated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `📻⚡ [Magic Jammer] ¡Descarta 1 carta para bloquear e invalidar la Carta Mágica activada!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
