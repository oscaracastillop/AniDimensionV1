/**
 * [Passcode: 85742772] Gravity Bind
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 85742772,
    name: "Gravity Bind",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,
    isGravityBind: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.gravityBindActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🪐⛓️ [Gravity Bind] ¡Atadura de la Gravedad activa! Ningún monstruo de Nivel 4 o mayor puede declarar ataques.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
