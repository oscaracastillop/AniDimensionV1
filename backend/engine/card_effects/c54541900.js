/**
 * [Passcode: 54541900] Karbonala Warrior
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [56342351,92731455]
 */
module.exports = {
    id: 54541900,
    name: "Karbonala Warrior",
    type: "Fusion Monster",
    atk: 1500,
    def: 1200,
    level: 4,
    race: "Warrior",
    isFusion: true,
    fusionMaterials: [56342351,92731455],

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
