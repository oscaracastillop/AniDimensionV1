module.exports = {
    id: 18895832,
    name: "System Down",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        p.lp = Math.max(0, (p.lp || 8000) - 1000);
        let banishedField = 0;
        for (let i = 0; i < 5; i++) {
            const m = opp.monsters[i];
            if (m && (m.race === 'Machine' || (m.type && m.type.toLowerCase().includes('machine')))) {
                opp.banished = opp.banished || [];
                opp.banished.push(m);
                opp.monsters[i] = null;
                banishedField++;
            }
        }
        const remainingGy = [];
        let banishedGy = 0;
        for (const c of opp.graveyard) {
            if (c && (c.race === 'Machine' || (c.type && c.type.toLowerCase().includes('machine')))) {
                opp.banished = opp.banished || [];
                opp.banished.push(c);
                banishedGy++;
            } else {
                remainingGy.push(c);
            }
        }
        opp.graveyard = remainingGy;
        utils.emitDuelLog(duelState.roomId, `⚡ [System Down] Paga 1000 LP y destierra ${banishedField} máquinas del campo y ${banishedGy} del cementerio del rival!`);
    }
};