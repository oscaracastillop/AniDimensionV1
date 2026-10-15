/**
 * [Passcode: 93016201] Royal Oppression
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 93016201,
    name: "Royal Oppression",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👑 [Royal Oppression] Trampa continua activa: Cualquier jugador puede pagar 800 LP para negar una Invocación Especial y destruirla.`, 'trap');
            return { success: true };
        },

    async onNegateSpecialSummon(context) {
            const { duelState, playerKey, summonedMonster, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 800) {
                p.lifePoints -= 800;
                effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Royal Oppression] Paga 800 LP (LP: ${p.lifePoints}) y niega la Invocación Especial de "${summonedMonster?.name || 'Monstruo'}".`, 'trap');
                return { success: true, negated: true };
            }
            return { success: false };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
