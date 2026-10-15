/**
 * [Passcode: 74703140] Punished Eagle
 * Tipo: Fusion Monster
 * Materiales: [41396436,706788]
 */
module.exports = {
    id: 74703140,
    name: "Punished Eagle",
    type: "Fusion Monster",
    atk: 2100,
    def: 1800,
    level: 6,
    race: "Winged Beast",
    isFusion: true,
    fusionMaterials: [41396436,706788],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
