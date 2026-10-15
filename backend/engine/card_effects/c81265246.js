module.exports = {
    id: 81866673,
    name: "Destiny HERO - Dasher",
    type: "EFFECT_MONSTER",
    onIgnitionEffect: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const tributeIdx = p.monsters.findIndex(m => m && m.id !== 81866673 && m.card_id !== 81866673);
        if (tributeIdx !== -1) {
            const tributed = p.monsters[tributeIdx];
            p.graveyard.push(tributed);
            p.monsters[tributeIdx] = null;
            const dasher = p.monsters.find(m => m && (m.id === 81866673 || m.card_id === 81866673));
            if (dasher) {
                dasher.atk = (dasher.atk || 2100) + 1000;
                utils.emitDuelLog(duelState.roomId, `💨 [Destiny HERO - Dasher] Sacrifica a ${tributed.name} y aumenta su ATK a ${dasher.atk}!`);
            }
        }
    }
};