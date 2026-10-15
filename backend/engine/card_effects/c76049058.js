module.exports = {
    id: 45898858,
    name: "Bonding - H2O",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        // Find Water Dragon in hand, deck, or gy
        const wdId = 85066822;
        let target = null;
        let from = '';
        let idx = p.hand.findIndex(c => Number(c.card_id || c.id) === wdId);
        if (idx !== -1) {
            target = p.hand.splice(idx, 1)[0];
            from = 'mano';
        } else {
            idx = p.deck.findIndex(c => Number(c.card_id || c.id) === wdId);
            if (idx !== -1) {
                target = p.deck.splice(idx, 1)[0];
                from = 'deck';
            } else {
                idx = p.graveyard.findIndex(c => Number(c.card_id || c.id) === wdId);
                if (idx !== -1) {
                    target = p.graveyard.splice(idx, 1)[0];
                    from = 'cementerio';
                }
            }
        }
        if (target) {
            const slot = p.monsters.findIndex(m => m === null);
            if (slot !== -1) {
                target.position = 'ATK';
                target.faceDown = false;
                p.monsters[slot] = target;
                utils.emitDuelLog(duelState.roomId, `💧 [Bonding - H2O] ¡Reacción H2O completada! Invoca a Water Dragon desde el ${from}!`);
            }
        }
    }
};