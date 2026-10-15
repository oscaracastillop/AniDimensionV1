module.exports = {
    id: 20394040,
    name: "Lava Battleguard",
    type: "Effect Monster",
    atk: 1550, def: 1600, level: 5, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasSwamp = monsters.some(m => m && (m.id === 40453765 || (m.name && m.name.includes('Swamp Battleguard'))));
        let boost = 0;
        if (hasSwamp) {
            boost = 500;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🔥🧌 [Lava Battleguard] ¡Guardia de Lava gana ${boost} ATK en sincronía con Guardia de Pantano!`, 'monster');
        return { success: true, boost };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
