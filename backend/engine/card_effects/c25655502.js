/**
 * [Passcode: 25655502] Bickuribox
 * Tipo: Fusion Monster
 * Materiales: [93889755,13215230]
 */
module.exports = {
    id: 25655502,
    name: "Bickuribox",
    type: "Fusion Monster",
    atk: 2300,
    def: 2000,
    level: 7,
    race: "Fiend",
    isFusion: true,
    fusionMaterials: [93889755,13215230],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
