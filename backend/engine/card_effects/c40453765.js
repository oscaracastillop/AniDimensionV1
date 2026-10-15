module.exports = {
    id: 40453765,
    name: "Swamp Battleguard",
    type: "Effect Monster",
    atk: 1800, def: 1500, level: 5, race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        const hasLava = monsters.some(m => m && (m.id === 20394040 || (m.name && m.name.includes('Lava Battleguard'))));
        let boost = 0;
        if (hasLava) {
            boost = 500;
        }
        effectUtils.emitDuelLog(duelState.roomId, `🛡️🧌 [Swamp Battleguard] ¡Guardia de Pantano gana ${boost} ATK en sincronía con Guardia de Lava!`, 'monster');
        return { success: true, boost };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
