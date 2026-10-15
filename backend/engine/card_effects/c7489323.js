module.exports = {
    id: 7489323,
    name: "Milus Radiant",
    type: "Effect Monster",
    atk: 300, def: 250, level: 1, race: "Beast",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'EARTH') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'WIND') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `🌱🐕 [Milus Radiant] ¡Resonancia Terrestre! Monstruos TIERRA ganan +500 ATK (-400 DEF) y monstruos VIENTO pierden 400 ATK.`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
