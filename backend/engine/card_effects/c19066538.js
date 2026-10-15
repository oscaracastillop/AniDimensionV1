/**
 * [Passcode: 19066538] Roaring Ocean Snake
 * Tipo: Fusion Monster
 * Materiales: [98049915,2368340]
 */
module.exports = {
    id: 19066538,
    name: "Roaring Ocean Snake",
    type: "Fusion Monster",
    atk: 2100,
    def: 1800,
    level: 6,
    race: "Aqua",
    isFusion: true,
    fusionMaterials: [98049915,2368340],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
