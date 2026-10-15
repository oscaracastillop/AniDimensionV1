/**
 * [Passcode: 1641882] Fusionist
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [38142739,30486065]
 */
module.exports = {
    id: 1641882,
    name: "Fusionist",
    type: "Fusion Monster",
    atk: 900,
    def: 700,
    level: 3,
    race: "Beast",
    isFusion: true,
    fusionMaterials: [38142739,30486065],

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
