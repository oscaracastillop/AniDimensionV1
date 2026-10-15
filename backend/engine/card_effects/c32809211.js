module.exports = {
    id: 32809211,
    name: "Jinzo #7",
    type: "Effect Monster",
    atk: 500, def: 400, level: 2, race: "Machine",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🤖 [Jinzo #7] ¡Jinzo #7 se infiltra y puede atacar directamente los Life Points del oponente!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
