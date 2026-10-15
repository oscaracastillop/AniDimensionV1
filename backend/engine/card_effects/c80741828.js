module.exports = {
    id: 80741828,
    name: "Witch's Apprentice",
    type: "Effect Monster",
    atk: 550, def: 500, level: 2, race: "Spellcaster",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        ['player1', 'player2'].forEach(pKey => {
            const p = (duelState.players && duelState.players[pKey]) || duelState[pKey] || {};
            (p.monsters || []).forEach(m => {
                if (m) {
                    if (m.attribute === 'DARK') {
                        m.atk = (m.atk || 0) + 500;
                        m.def = Math.max(0, (m.def || 0) - 400);
                    } else if (m.attribute === 'LIGHT') {
                        m.atk = Math.max(0, (m.atk || 0) - 400);
                        m.def = Math.max(0, (m.def || 0) - 400);
                    }
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `🧙‍♀️🌑 [Witch's Apprentice] ¡Niebla Sombría! Monstruos OSCURIDAD ganan +500 ATK (-400 DEF) y monstruos LUZ pierden 400 ATK.`, 'monster');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
