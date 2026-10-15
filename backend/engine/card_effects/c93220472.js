/**
 * [Passcode: 93220472] Cave Dragon
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 93220472,
    name: "Cave Dragon",
    type: "Effect Monster",
    atk: 2000,
    def: 100,
    level: 4,
    race: "Dragon",
    attribute: "WIND",

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },

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
