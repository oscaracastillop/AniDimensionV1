module.exports = {
    id: 71587526,
    name: "Karma Cut",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        if (p.hand.length > 0) {
            const discarded = p.hand.pop();
            p.graveyard.push(discarded);
            for (let i = 0; i < 5; i++) {
                if (opp.monsters[i]) {
                    const target = opp.monsters[i];
                    opp.banished = opp.banished || [];
                    opp.banished.push(target);
                    opp.monsters[i] = null;
                    utils.emitDuelLog(duelState.roomId, `✂️ [Karma Cut] ¡Corte del Karma destierra a ${target.name} y todas sus copias del Cementerio!`);
                    break;
                }
            }
        }
    }
};