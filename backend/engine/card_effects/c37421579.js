/**
 * [Passcode: 37421579] Charubin the Fire Knight
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [36121917,96851799]
 */
module.exports = {
    id: 37421579,
    name: "Charubin the Fire Knight",
    type: "Fusion Monster",
    atk: 1100,
    def: 800,
    level: 3,
    race: "Pyro",
    isFusion: true,
    fusionMaterials: [36121917,96851799],

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
