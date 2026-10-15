/**
 * [Passcode: 38199696] Red Medicine
 * Tipo: Normal Spell | Expansión: LOB
 */
module.exports = {
    id: 38199696,
    name: "Red Medicine",
    type: "Normal Spell",
    race: "Spell",
    amount: 500,
    isLpRecovery: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        p.lp += this.amount;

        effectUtils.emitDuelLog(duelState.roomId, `💖✨ [${this.name}] ¡${p.username || playerKey} recupera ${this.amount} LP! (LP: ${p.lp})`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
