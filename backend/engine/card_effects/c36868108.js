/**
 * [Passcode: 36868108] Armored Glass
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 36868108,
    name: "Armored Glass",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🪟 [Armored Glass] ¡Cristal Blindado activo! Las cartas de equipo no surten efecto en los monstruos este turno.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
