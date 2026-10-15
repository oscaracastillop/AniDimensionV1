/**
 * [Passcode: 76297408] Soul Demolition
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 76297408,
    name: "Soul Demolition",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 500) return { canActivate: false, reason: "Se requieren más de 500 LP para activar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            p.lifePoints = Math.max(0, (p.lifePoints || 0) - 500);

            let banished = 0;
            if (opp?.graveyard && opp.graveyard.length > 0) {
                opp.banished = opp.banished || [];
                const c = opp.graveyard.pop();
                opp.banished.push(c);
                banished++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `👻💥 [Soul Demolition] Paga 500 LP y destierra ${banished} monstruo del Cementerio rival (LP: ${p.lifePoints}).`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
