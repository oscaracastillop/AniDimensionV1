/**
 * [Passcode: 79870141] Mad Sword Beast
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 79870141,
    name: "Mad Sword Beast",
    type: "Effect Monster",
    atk: 1400,
    def: 1200,
    level: 4,
    race: "Dinosaur",
    attribute: "EARTH",
    hasPiercing: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦖⚔️ [Mad Sword Beast] ¡Furia de penetración! Inflige daño de batalla por penetración contra monstruos en Defensa.`, 'monster');
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
