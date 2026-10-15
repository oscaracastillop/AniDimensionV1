/**
 * [Passcode: 95220856] Vengeful Bog Spirit
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 95220856,
    name: "Vengeful Bog Spirit",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.vengefulBogSpiritActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌫️👻 [Vengeful Bog Spirit] ¡Espíritu Vengativo del Pantano activo! Los monstruos invocados no pueden atacar durante el turno en que son convocados.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
