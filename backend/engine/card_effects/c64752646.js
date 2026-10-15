/**
 * [Passcode: 64752646] Fire Princess
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 64752646,
    name: "Fire Princess",
    type: "Effect Monster",
    atk: 1300,
    def: 1500,
    level: 4,
    race: "Pyro",
    attribute: "FIRE",

    canActivate() { return { canActivate: false, reason: "Efecto disparado continuo ante ganancia de LP." }; },

    async onLifePointsGained(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp) {
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `👑🔥 [Fire Princess] ¡Cada vez que ganas LP, inflige 500 de daño a ${opp.username}! (LP: ${opp.lifePoints}).`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onLifePointsGained({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
