module.exports = {
    id: 41613948,
    name: "Destiny HERO - Doom Lord",
    type: "EFFECT_MONSTER",
    onIgnitionEffect: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const opp = duelState[opponentKey];
        for (let i = 0; i < 5; i++) {
            if (opp.monsters[i]) {
                const banished = opp.monsters[i];
                opp.banished = opp.banished || [];
                opp.banished.push(banished);
                opp.monsters[i] = null;
                utils.emitDuelLog(duelState.roomId, `⏳ [Destiny HERO - Doom Lord] ¡Destierra temporalmente a ${banished.name} por la distorsión del destino!`);
                break;
            }
        }
    }
};