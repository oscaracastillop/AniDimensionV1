/**
 * [Passcode: 58528964] Flame Ghost
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [32274490,40826495]
 */
module.exports = {
    id: 58528964,
    name: "Flame Ghost",
    type: "Fusion Monster",
    atk: 1000,
    def: 800,
    level: 3,
    race: "Zombie",
    isFusion: true,
    fusionMaterials: [32274490,40826495],

    canActivate({ duelState, playerKey, opponentKey }) {
        return { 
            canActivate: false, 
            reason: "Los Monstruos de Fusión sin efecto de ignición no se activan manualmente desde el campo." 
        };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Monstruo de Fusión invocado desde el Extra Deck.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
