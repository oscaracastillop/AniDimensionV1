module.exports = {
    id: 25573054,
    name: "Transcendent Wings",
    type: "QUICKPLAY_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        // Special summon Winged Kuriboh LV10 from hand or deck
        const wk10Id = 98585345;
        let targetCard = null;
        let fromLocation = '';
        const handIdx = p.hand.findIndex(c => Number(c.card_id || c.id) === wk10Id);
        if (handIdx !== -1) {
            targetCard = p.hand.splice(handIdx, 1)[0];
            fromLocation = 'mano';
        } else {
            const deckIdx = p.deck.findIndex(c => Number(c.card_id || c.id) === wk10Id);
            if (deckIdx !== -1) {
                targetCard = p.deck.splice(deckIdx, 1)[0];
                fromLocation = 'deck';
            }
        }
        if (targetCard) {
            const slot = p.monsters.findIndex(m => m === null);
            if (slot !== -1) {
                targetCard.position = 'ATK';
                targetCard.faceDown = false;
                p.monsters[slot] = targetCard;
                utils.emitDuelLog(duelState.roomId, `👼 [Transcendent Wings] ¡Invoca a Winged Kuriboh LV10 desde el ${fromLocation}!`);
            }
        }
    }
};