/**
 * [Passcode: 62867251] Light of Intervention
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 62867251,
    name: "Light of Intervention",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.lightOfInterventionActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `☀️✨ [Light of Intervention] ¡Luz de Intervención activa! Ningún monstruo puede colocarse boca abajo; deben invocarse boca arriba en Posición de Defensa.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
