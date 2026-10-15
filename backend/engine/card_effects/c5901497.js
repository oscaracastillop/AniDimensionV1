module.exports = {
    id: 5901497,
    name: "Queen's Double",
    type: "Effect Monster",
    atk: 350, def: 300, level: 1, race: "Warrior",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `👑👤 [Queen's Double] ¡Doble de la Reina confunde las líneas enemigas y puede atacar directamente!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
