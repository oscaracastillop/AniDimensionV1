/**
 * [Passcode: 21175632] St. Joan
 * Tipo: Fusion Monster | Expansión: LON
 */
module.exports = {
    id: 21175632,
    name: "St. Joan",
    type: "Fusion Monster",
    atk: 2800,
    def: 2000,
    level: 7,
    race: "Fairy",
    attribute: "LIGHT",
    isFusion: true,
    fusionMaterials: [84080938,57579381],

    canActivate() { return { canActivate: false, reason: "Monstruo de Fusión sin efecto de ignición." }; },

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
