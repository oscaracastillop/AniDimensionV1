/**
 * [Passcode: 95952802] Flower Wolf
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [90357090,43500484]
 */
module.exports = {
    id: 95952802,
    name: "Flower Wolf",
    type: "Fusion Monster",
    atk: 1800,
    def: 1400,
    level: 5,
    race: "Beast",
    isFusion: true,
    fusionMaterials: [90357090,43500484],

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
