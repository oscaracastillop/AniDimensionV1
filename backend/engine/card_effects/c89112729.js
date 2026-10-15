/**
 * [Passcode: 89112729] Cyber Saurus
 * Tipo: Fusion Monster
 * Materiales: [70138455,94119974]
 */
module.exports = {
    id: 89112729,
    name: "Cyber Saurus",
    type: "Fusion Monster",
    atk: 1800,
    def: 1400,
    level: 5,
    race: "Machine",
    isFusion: true,
    fusionMaterials: [70138455,94119974],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
