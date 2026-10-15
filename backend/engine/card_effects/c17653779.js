/**
 * [Passcode: 17653779] Fairy's Hand Mirror
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 17653779,
    name: "Fairy's Hand Mirror",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🪞⚡ [${this.name}] ¡Espejo de Mano del Hada redirige el objetivo de la Carta Mágica!`, 'trap');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
