/**
 * [Passcode: 44763025] Delinquent Duo
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 44763025,
    name: "Delinquent Duo",
    type: "Normal Spell",
    race: "Spell",
    isHandDisruption: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];
        if (!p || p.lp <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP para activar Delinquent Duo." };
        if (!opp || !opp.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        p.lp = Math.max(0, (p.lp || 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, `💔 [${this.name}] ${p.username} paga 1000 LP (LP: ${p.lp}).`, 'cost');

        let discardedCount = 0;
        const count = Math.min(2, opp.hand.length);
        for (let i = 0; i < count; i++) {
            if (opp.hand.length > 0) {
                const rand = Math.floor(Math.random() * opp.hand.length);
                const discarded = opp.hand.splice(rand, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
                discardedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `👥💥 [${this.name}] ¡El rival descartó ${discardedCount} carta(s) de su mano al Cementerio!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
