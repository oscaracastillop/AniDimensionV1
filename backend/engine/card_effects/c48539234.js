/**
 * [Passcode: 48539234] Appropriate
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 48539234,
    name: "Appropriate",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⚖️🃏 [Appropriate] ¡Activa! Cada vez que el rival robe fuera de su Draw Phase, robarás 2 cartas.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
