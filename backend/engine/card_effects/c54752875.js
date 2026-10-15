/**
 * [Passcode: 54752875] Twin-Headed Thunder Dragon
 * Tipo: Fusion Monster
 * Materiales: [31786629,31786629]
 */
module.exports = {
    id: 54752875,
    name: "Twin-Headed Thunder Dragon",
    type: "Fusion Monster",
    atk: 2800,
    def: 2100,
    level: 7,
    race: "Thunder",
    isFusion: true,
    fusionMaterials: [31786629,31786629],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
