/**
 * [Passcode: 11901678] Black Skull Dragon
 * Tipo: Fusion Monster
 * Materiales: [70781052,74677422]
 */
module.exports = {
    id: 11901678,
    name: "Black Skull Dragon",
    type: "Fusion Monster",
    atk: 3200,
    def: 2500,
    level: 9,
    race: "Dragon",
    isFusion: true,
    fusionMaterials: [70781052,74677422],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
