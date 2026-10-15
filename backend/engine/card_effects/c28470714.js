module.exports = {
    id: 28470714,
    name: "Bladefly",
    type: "Effect Monster",
    atk: 600, def: 700, level: 2, race: "Insect",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'WIND') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'EARTH') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `🌪️🪰 [Bladefly] ¡Vendaval Cortante! Monstruos VIENTO ganan +500 ATK (-400 DEF) y monstruos TIERRA pierden 400 ATK.`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
