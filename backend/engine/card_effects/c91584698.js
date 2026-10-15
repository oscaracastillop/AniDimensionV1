module.exports = {
    id: 6540606,
    name: "Spiritual Water Art - Aoi",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        const waterIdx = p.monsters.findIndex(m => m && (m.attribute === 'WATER' || (m.type && m.type.toLowerCase().includes('water'))));
        if (waterIdx !== -1) {
            const tribute = p.monsters[waterIdx];
            p.graveyard.push(tribute);
            p.monsters[waterIdx] = null;
            if (opp.hand.length > 0) {
                const discarded = opp.hand.pop();
                opp.graveyard.push(discarded);
                utils.emitDuelLog(duelState.roomId, `🌊 [Spiritual Water Art - Aoi] Sacrifica a ${tribute.name} y envía ${discarded.name || '1 carta'} de la mano rival al cementerio!`);
            }
        }
    }
};