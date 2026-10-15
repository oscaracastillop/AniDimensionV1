module.exports = {
    id: 51945556,
    name: "Zaborg the Thunder Monarch",
    type: "Effect Monster",
    atk: 2400, def: 1000, level: 6, race: "Thunder",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let destroyed = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                destroyed = oppMonsters[i];
                effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                oppMonsters[i] = null;
                break;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚡👑 [Zaborg the Thunder Monarch] ¡Zaborg el Monarca del Trueno es Invocado por Sacrificio y destruye a '${destroyed ? destroyed.name : 'Monstruo'}' con un rayo fulminante!`, 'monster');
        return { success: true, destroyed: destroyed ? destroyed.name : null };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
