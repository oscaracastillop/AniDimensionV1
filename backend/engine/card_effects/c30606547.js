/**
 * [Passcode: 30606547] The Dark Door
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 30606547,
    name: "The Dark Door",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.darkDoorActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🚪🌑 [The Dark Door] ¡La Puerta Oscura activa! Cada jugador solo puede declarar 1 ataque por Battle Phase.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
