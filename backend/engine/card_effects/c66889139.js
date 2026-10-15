/**
 * [Passcode: 66889139] Gaia the Dragon Champion
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [6368038,28279543]
 */
module.exports = {
    id: 66889139,
    name: "Gaia the Dragon Champion",
    type: "Fusion Monster",
    atk: 2600,
    def: 2100,
    level: 7,
    race: "Dragon",
    isFusion: true,
    fusionMaterials: [6368038,28279543],

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
