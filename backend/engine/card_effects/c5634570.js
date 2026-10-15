module.exports = {
    id: 90440725,
    name: "Cyber Shadow Gardna",
    type: "CONTINUOUS_TRAP",
    isTrapMonster: true,
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const slot = p.monsters.findIndex(m => m === null);
        if (slot !== -1) {
            p.monsters[slot] = {
                card_id: 90440725,
                id: 90440725,
                name: "Cyber Shadow Gardna",
                type: "Continuous Trap / Trap Monster",
                position: "defense",
                level: 4,
                atk: 0,
                def: 0,
                race: "Machine",
                attribute: "EARTH",
                isTrapMonster: true
            };
            utils.emitDuelLog(duelState.roomId, `🤖 [Cyber Shadow Gardna] ¡Se manifiesta como monstruo trampa en el campo!`);
        }
    }
};