module.exports = {
    id: 32679370,
    name: "Hero Kid",
    type: "EFFECT_MONSTER",
    onSpecialSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        let summoned = 0;
        for (let i = p.deck.length - 1; i >= 0; i--) {
            const c = p.deck[i];
            if (c && ((c.name || '').includes('Hero Kid') || c.card_id === 32679370)) {
                const slot = p.monsters.findIndex(m => m === null);
                if (slot !== -1) {
                    p.deck.splice(i, 1);
                    c.position = 'attack';
                    p.monsters[slot] = c;
                    summoned++;
                }
            }
        }
        if (summoned > 0) {
            utils.emitDuelLog(duelState.roomId, `🦸 [Hero Kid] ¡Refuerzos heroicos! Invoca ${summoned} Hero Kid adicionales del Deck!`);
        }
    }
};