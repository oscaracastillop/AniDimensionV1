/**
 * [Passcode: 66235877] Fiend Skull Dragon
 * Tipo: Fusion Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 66235877,
    name: "Fiend Skull Dragon",
    type: "Fusion Effect Monster",
    atk: 2000,
    def: 1200,
    level: 5,
    race: "Dragon",
    attribute: "WIND",
    isFusion: true,
    fusionMaterials: [93220472,16475472],
    immuneToTrapTargeting: true,
    negatesFlipEffects: true,

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
