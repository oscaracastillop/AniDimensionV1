/**
 * [Passcode: 17881964] Darkfire Dragon
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [53293545,75356994]
 */
module.exports = {
    id: 17881964,
    name: "Darkfire Dragon",
    type: "Fusion Monster",
    atk: 1500,
    def: 1250,
    level: 4,
    race: "Dragon",
    isFusion: true,
    fusionMaterials: [53293545,75356994],

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
