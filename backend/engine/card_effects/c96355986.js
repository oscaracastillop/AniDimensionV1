/**
 * [Passcode: 96355986] Enchanted Javelin
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 96355986,
    name: "Enchanted Javelin",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState }) {
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const atkDmg = targetData?.attacker_atk || 1500;
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + atkDmg;
            effectUtils.emitDuelLog(duelState.roomId, `🔱💖 [Enchanted Javelin] ¡Jabalina Encantada absorbe el impacto! Recuperas ${atkDmg} Life Points. (LP: ${duelState[playerKey].lp})`, 'heal');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
