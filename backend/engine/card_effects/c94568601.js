/**
 * [Passcode: 94568601] Tyrant Dragon
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 94568601,
    name: "Tyrant Dragon",
    type: "Effect Monster",
    atk: 2900,
    def: 2500,
    level: 8,
    race: "Dragon",
    attribute: "FIRE",
    immuneToTrapTargeting: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de combate." }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
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
