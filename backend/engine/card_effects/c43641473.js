/**
 * [Passcode: 43641473] Tailor of the Fickle
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 43641473,
    name: "Tailor of the Fickle",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `✂️✨ [${this.name}] ¡Sastre Voluble reubica una Carta de Equipo en otro objetivo válido!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
