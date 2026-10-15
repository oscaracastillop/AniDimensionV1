/**
 * [Passcode: 28593363] Deepsea Shark
 * Tipo: Fusion Monster
 * Materiales: [81386177,69572024]
 */
module.exports = {
    id: 28593363,
    name: "Deepsea Shark",
    type: "Fusion Monster",
    atk: 1900,
    def: 1600,
    level: 5,
    race: "Fish",
    isFusion: true,
    fusionMaterials: [81386177,69572024],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
