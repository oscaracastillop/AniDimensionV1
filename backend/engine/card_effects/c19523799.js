/**
 * [Passcode: 19523799] Ookazi
 * Tipo: Normal Spell | Expansión: Metal Raiders (MRD-034)
 * Descripción Oficial: Inflict 800 points of damage to your opponent's Life Points.
 */
module.exports = {
    id: 19523799,
    name: "Ookazi",
    type: "Normal Spell",
    race: "Spell",
    amount: 800,
    isBurnSpell: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp) return { success: false };

        opp.lp = Math.max(0, opp.lp - this.amount);

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🔥💥 [${this.name}] ¡Inflige ${this.amount} de daño de efecto a ${opp.username || oppKey}! (LP: ${opp.lp})`,
            'damage'
        );

        effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
