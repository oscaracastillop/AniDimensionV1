/**
 * [Passcode: 73134081] Final Flame
 * Tipo: Normal Spell | Expansión: LOB
 */
module.exports = {
    id: 73134081,
    name: "Final Flame",
    type: "Normal Spell",
    race: "Spell",
    amount: 600,
    isBurnSpell: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        opp.lp = Math.max(0, opp.lp - this.amount);
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);

        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡Inflige ${this.amount} de daño de efecto a ${opp.username || oppKey}! (LP: ${opp.lp})`, 'damage');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
