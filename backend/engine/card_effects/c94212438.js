/**
 * [Passcode: 94212438] Destiny Board
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 94212438,
    name: "Destiny Board",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,
    isDestinyBoard: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.destinyBoardOwner = playerKey;
            duelState.destinyBoardLetters = ["F"];
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Destiny Board] ¡Tablero del Destino activado! La letra "F" aparece. Colocará "I", "N", "A", "L" en cada turno del oponente para lograr la victoria automática.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
