/**
 * [Passcode: 40640057] Kuriboh
 * Tipo: Effect Monster
 */
module.exports = {
    id: 40640057,
    name: "Kuriboh",
    type: "Effect Monster",
    atk: 300,
    def: 200,
    level: 1,
    race: "Fiend",
    isHandTrap: true,
isHandEffect: true,
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
            duelState.pendingAction.damageNegated = true;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌰✨ [Kuriboh] ¡Se descarta de la mano para reducir el daño de batalla a 0!`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
