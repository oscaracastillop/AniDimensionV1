/**
 * [Passcode: 88132637] Twin-Headed Wolf
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 88132637,
    name: "Twin-Headed Wolf",
    type: "Effect Monster",
    atk: 1500,
    def: 1000,
    level: 4,
    race: "Fiend",
    attribute: "DARK",

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
