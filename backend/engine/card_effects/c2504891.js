/**
 * [Passcode: 2504891] Skull Knight
 * Tipo: Fusion Monster
 * Materiales: [28725004,42431843]
 */
module.exports = {
    id: 2504891,
    name: "Skull Knight",
    type: "Fusion Monster",
    atk: 2650,
    def: 2250,
    level: 7,
    race: "Spellcaster",
    isFusion: true,
    fusionMaterials: [28725004,42431843],

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚔️✨ [${this.name}] Invocado por Fusión al campo de batalla.`, 'summon');
        return { success: true };
    },

    async execute(context) {
        return this.onActivate(context.duelState, context.playerKey, context.opponentKey, context.targetData, context.link, context.effectUtils);
    }
};
