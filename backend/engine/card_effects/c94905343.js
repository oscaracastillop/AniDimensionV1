/**
 * [Passcode: 94905343] Rabid Horseman
 * Tipo: Fusion Monster
 * Materiales: [5053103,6851286]
 */
module.exports = {
    id: 94905343,
    name: "Rabid Horseman",
    type: "Fusion Monster",
    atk: 2000,
    def: 1700,
    level: 6,
    race: "Beast-Warrior",
    isFusion: true,
    fusionMaterials: [5053103,6851286],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
