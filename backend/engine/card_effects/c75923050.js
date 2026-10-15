/**
 * [Passcode: 75923050] Super Robolady
 * Tipo: Fusion Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 75923050,
    name: "Super Robolady",
    type: "Fusion Effect Monster",
    atk: 1200,
    def: 500,
    level: 6,
    race: "Machine",
    attribute: "EARTH",
    isFusion: true,
    fusionMaterials: [23643617,48766543],

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🤖 [Super Robolady] En la Main Phase puede intercambiarse con "Super Roboyarou".`, 'monster');
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
