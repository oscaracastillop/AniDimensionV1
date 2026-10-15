/**
 * [Passcode: 56907389] Musician King
 * Tipo: Fusion Monster
 * Materiales: [78010363,85639857]
 */
module.exports = {
    id: 56907389,
    name: "Musician King",
    type: "Fusion Monster",
    atk: 1750,
    def: 1500,
    level: 5,
    race: "Spellcaster",
    isFusion: true,
    fusionMaterials: [78010363,85639857],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
