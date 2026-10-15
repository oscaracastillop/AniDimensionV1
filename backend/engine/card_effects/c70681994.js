/**
 * [Passcode: 70681994] Dragoness the Wicked Knight
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [15480588,33064647]
 */
module.exports = {
    id: 70681994,
    name: "Dragoness the Wicked Knight",
    type: "Fusion Monster",
    atk: 1200,
    def: 900,
    level: 3,
    race: "Warrior",
    isFusion: true,
    fusionMaterials: [15480588,33064647],

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
