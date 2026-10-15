/**
 * [Passcode: 51828629] Giltia the D. Knight
 * Tipo: Fusion Monster
 * Materiales: [89272878,47529357]
 */
module.exports = {
    id: 51828629,
    name: "Giltia the D. Knight",
    type: "Fusion Monster",
    atk: 1850,
    def: 1500,
    level: 5,
    race: "Warrior",
    isFusion: true,
    fusionMaterials: [89272878,47529357],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
