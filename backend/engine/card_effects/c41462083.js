/**
 * [Passcode: 41462083] Thousand Dragon
 * Tipo: Fusion Monster
 * Materiales: [71625222,88819587]
 */
module.exports = {
    id: 41462083,
    name: "Thousand Dragon",
    type: "Fusion Monster",
    atk: 2400,
    def: 2000,
    level: 7,
    race: "Dragon",
    isFusion: true,
    fusionMaterials: [71625222,88819587],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
