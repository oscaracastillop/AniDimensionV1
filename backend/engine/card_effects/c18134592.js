module.exports = {
    id: 70156997,
    name: "Spiritual Earth Art - Kurogane",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const earthIdx = p.monsters.findIndex(m => m && (m.attribute === 'EARTH' || (m.type && m.type.toLowerCase().includes('earth'))));
        if (earthIdx !== -1) {
            const tribute = p.monsters[earthIdx];
            p.graveyard.push(tribute);
            p.monsters[earthIdx] = null;
            const targetInGy = p.graveyard.find(c => c && c !== tribute && (c.attribute === 'EARTH' || (c.type && c.type.toLowerCase().includes('earth'))) && (c.level || 0) <= 4);
            if (targetInGy) {
                const gyIndex = p.graveyard.indexOf(targetInGy);
                p.graveyard.splice(gyIndex, 1);
                targetInGy.position = 'attack';
                p.monsters[earthIdx] = targetInGy;
                utils.emitDuelLog(duelState.roomId, `⛰️ [Spiritual Earth Art - Kurogane] Sacrifica a ${tribute.name} e invoca a ${targetInGy.name} desde el cementerio!`);
            }
        }
    }
};