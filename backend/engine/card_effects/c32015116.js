/**
 * [Passcode: 32015116] Blind Destruction
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 32015116,
    name: "Blind Destruction",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎲💥 [Blind Destruction] En tu Standby Phase lanza 1 dado: destruye todos los monstruos en el campo cuyo Nivel coincida con el resultado.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
