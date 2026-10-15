/**
 * [Passcode: 423705] Gearfried the Iron Knight
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 423705,
    name: "Gearfried the Iron Knight",
    type: "Effect Monster",
    atk: 1800,
    def: 1600,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    isGearfried: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [Gearfried the Iron Knight] ¡La armadura de hierro repele y destruye automáticamente cualquier carta de equipo vinculada a él!`, 'monster');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
