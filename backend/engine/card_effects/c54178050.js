/**
 * [Passcode: 54178050] Dragon's Rage
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 54178050,
    name: "Dragon's Rage",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,
    hasDragonPiercing: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🐉💥 [Dragon's Rage] Trampa continua activa: Todos tus monstruos de Tipo Dragón infligen daño de penetración contra monstruos en Posición de Defensa.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
