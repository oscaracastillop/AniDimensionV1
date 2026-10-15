/**
 * [Passcode: 29549364] Mask of Restrict
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 29549364,
    name: "Mask of Restrict",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.maskOfRestrictActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🎭🚫 [Mask of Restrict] ¡Máscara de Restricción activa! Ningún jugador puede tributar monstruos bajo ninguna circunstancia.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
