/**
 * [Passcode: 9653271] Kaminari Attack
 * Tipo: Fusion Monster
 * Materiales: [86088138,21987073]
 */
module.exports = {
    id: 9653271,
    name: "Kaminari Attack",
    type: "Fusion Monster",
    atk: 1900,
    def: 1400,
    level: 5,
    race: "Thunder",
    isFusion: true,
    fusionMaterials: [86088138,21987073],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
