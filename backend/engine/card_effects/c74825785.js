module.exports = {
    id: 74825788,
    name: "H - Heated Heart",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const m = p.monsters.find(x => x !== null);
        if (m) {
            m.atk = (m.atk || 0) + 500;
            m.piercing = true;
            utils.emitDuelLog(duelState.roomId, `🔥 [H - Heated Heart] ¡Corazón Ardiente otorga +500 ATK y Daño de Penetración a ${m.name}!`);
        }
    }
};