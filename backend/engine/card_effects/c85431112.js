module.exports = {
    id: 53567095,
    name: "Icarus Attack",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        const wbIdx = p.monsters.findIndex(m => m && (m.race === 'Winged Beast' || (m.type && m.type.toLowerCase().includes('winged beast'))));
        if (wbIdx !== -1) {
            const tribute = p.monsters[wbIdx];
            p.graveyard.push(tribute);
            p.monsters[wbIdx] = null;
            let destroyed = 0;
            for (let i = 0; i < 5 && destroyed < 2; i++) {
                if (opp.monsters[i]) {
                    opp.graveyard.push(opp.monsters[i]);
                    opp.monsters[i] = null;
                    destroyed++;
                } else if (opp.spells[i]) {
                    opp.graveyard.push(opp.spells[i]);
                    opp.spells[i] = null;
                    destroyed++;
                }
            }
            utils.emitDuelLog(duelState.roomId, `🪶 [Icarus Attack] Sacrifica a ${tribute.name} y destruye ${destroyed} cartas del adversario!`);
        }
    }
};