/**
 * [Passcode: 55763552] Dragon Piper
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 55763552,
    name: "Dragon Piper",
    type: "Flip Effect Monster",
    atk: 200,
    def: 1800,
    level: 3,
    race: "Pyro",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, `🪈✨ [Dragon Piper] ¡EFECTO DE VOLTEO! Destruye las Jarras de Captura de Dragones del campo.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
