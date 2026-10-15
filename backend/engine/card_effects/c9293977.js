/**
 * [Passcode: 9293977] Metal Dragon
 * Tipo: Fusion Monster | Expansión: LOB
 * Materiales Oficiales: [29172562,55444629]
 */
module.exports = {
    id: 9293977,
    name: "Metal Dragon",
    type: "Fusion Monster",
    atk: 1850,
    def: 1700,
    level: 6,
    race: "Machine",
    isFusion: true,
    fusionMaterials: [29172562,55444629],

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
