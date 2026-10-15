/**
 * [Passcode: 62966332] Convulsion of Nature
 * Tipo: Continuous Spell | Expansión: LOD
 */
module.exports = {
    id: 62966332,
    name: "Convulsion of Nature",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.reverseDecks = true;
            effectUtils.emitDuelLog(duelState.roomId, `🔄📚 [Convulsion of Nature] ¡Magia continua activa! Ambos jugadores voltean sus Decks boca arriba por el resto del duelo.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
