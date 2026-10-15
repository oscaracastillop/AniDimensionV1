/**
 * [Passcode: 99551425] Labyrinth Tank
 * Tipo: Fusion Monster
 * Materiales: [8471389,11384280]
 */
module.exports = {
    id: 99551425,
    name: "Labyrinth Tank",
    type: "Fusion Monster",
    atk: 2400,
    def: 2400,
    level: 7,
    race: "Machine",
    isFusion: true,
    fusionMaterials: [8471389,11384280],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
