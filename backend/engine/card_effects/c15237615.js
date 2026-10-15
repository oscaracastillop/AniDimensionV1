/**
 * [Passcode: 15237615] Empress Judge
 * Tipo: Fusion Monster
 * Materiales: [5901497,64501875]
 */
module.exports = {
    id: 15237615,
    name: "Empress Judge",
    type: "Fusion Monster",
    atk: 2100,
    def: 1700,
    level: 6,
    race: "Warrior",
    isFusion: true,
    fusionMaterials: [5901497,64501875],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
