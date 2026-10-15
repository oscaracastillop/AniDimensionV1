/**
 * [Passcode: 90502999] Ground Collapse
 * Tipo: Continuous Spell | Expansión: PSV
 */
module.exports = {
    id: 90502999,
    name: "Ground Collapse",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🕳️🚧 [Ground Collapse] ¡El suelo colapsa bloqueando 2 casillas de monstruo del rival!`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
