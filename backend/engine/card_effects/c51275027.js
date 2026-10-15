module.exports = {
    id: 51275027,
    name: "The Unhappy Maiden",
    type: "Effect Monster",
    atk: 100, def: 100, level: 1, race: "Spellcaster",

    async onDestroyedByBattle(context) {
        const { duelState, effectUtils } = context;
        duelState.currentPhase = 'END_PHASE';
        effectUtils.emitDuelLog(duelState.roomId, `😢🕊️ [The Unhappy Maiden] ¡Destruida en batalla! Su llanto detiene el conflicto y finaliza inmediatamente la Battle Phase.`, 'monster');
        return { success: true, battlePhaseEnded: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onDestroyedByBattle({ duelState, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
