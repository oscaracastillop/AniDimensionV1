module.exports = {
    id: 12472242,
    name: "Leghul",
    type: "Effect Monster",
    atk: 300, def: 350, level: 1, race: "Insect",
    canAttackDirectly: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🦗 [Leghul] ¡Leghul evade a los monstruos defensores y puede atacar directamente al oponente!`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
