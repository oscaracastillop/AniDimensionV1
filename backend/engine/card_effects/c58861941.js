module.exports = {
    id: 58861941,
    name: "Ooguchi",
    type: "Effect Monster",
    atk: 400, def: 300, level: 1, race: "Aqua",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `👄 [Ooguchi] ¡Ooguchi abre su enorme boca y ataca directamente a los Life Points rivales!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
