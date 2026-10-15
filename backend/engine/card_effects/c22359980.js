/**
 * [Passcode: 22359980] Mirror Wall
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 22359980,
    name: "Mirror Wall",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.mirrorWallActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🪞🛡️ [Mirror Wall] ¡Pared de Espejos activa! Reduce a la mitad el ATK de los monstruos atacantes del rival.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
