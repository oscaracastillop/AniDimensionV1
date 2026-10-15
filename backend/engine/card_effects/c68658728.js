module.exports = {
    id: 68658728,
    name: "Little Chimera",
    type: "Effect Monster",
    atk: 600, def: 550, level: 2, race: "Beast",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'FIRE') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'WATER') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `🔥🦁 [Little Chimera] ¡Calor Abrasador! Monstruos FUEGO ganan +500 ATK (-400 DEF) y monstruos AGUA pierden 400 ATK.`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
