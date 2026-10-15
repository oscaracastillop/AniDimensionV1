/**
 * [Passcode: 14318794] Life Absorbing Machine
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 14318794,
    name: "Life Absorbing Machine",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔋 [Life Absorbing Machine] Trampa continua activa: Recuperas la mitad de los LP pagados como costo en tu Standby Phase.`, 'trap');
            return { success: true };
        },

    async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.lpPaidLastTurn) {
                const recovered = Math.floor(p.lpPaidLastTurn / 2);
                p.lifePoints = (p.lifePoints || 0) + recovered;
                p.lpPaidLastTurn = 0;
                effectUtils.emitDuelLog(duelState.roomId, `🔋✨ [Life Absorbing Machine] Recupera la mitad de los LP pagados el turno anterior (+${recovered} LP, LP: ${p.lifePoints}).`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
