/**
 * [Passcode: 45231177] Flame Swordsman
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [34460851,44287299]
 */
module.exports = {
    id: 45231177,
    name: "Flame Swordsman",
    type: "Fusion Monster",
    atk: 1800,
    def: 1600,
    level: 5,
    race: "Warrior",
    isFusion: true,
    fusionMaterials: [34460851,44287299],

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
