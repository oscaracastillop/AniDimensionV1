/**
 * [Passcode: 99173029] Spiritual Energy Settle Machine
 * Tipo: Continuous Spell | Expansión: LOD
 */
module.exports = {
    id: 99173029,
    name: "Spiritual Energy Settle Machine",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,
    preventsSpiritReturn: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🌀⚙️ [Spiritual Energy Settle Machine] Magia continua activa: Los monstruos Spirit no regresan a la mano durante la End Phase. Descarta 1 carta en tu End Phase como mantenimiento.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
