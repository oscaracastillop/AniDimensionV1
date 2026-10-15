/**
 * [Passcode: 5600127] Humanoid Worm Drake
 * Tipo: Fusion Monster | Expansión: LON
 */
module.exports = {
    id: 5600127,
    name: "Humanoid Worm Drake",
    type: "Fusion Monster",
    atk: 2200,
    def: 2000,
    level: 7,
    race: "Aqua",
    attribute: "WATER",
    isFusion: true,
    fusionMaterials: [73216412,46821314],

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
