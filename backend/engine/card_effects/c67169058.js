module.exports = {
    id: 67169062,
    name: "Pot of Avarice",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const monsterIndices = [];
        for (let i = 0; i < p.graveyard.length; i++) {
            const c = p.graveyard[i];
            if (c && c.type && c.type.toLowerCase().includes('monster')) {
                monsterIndices.push(i);
                if (monsterIndices.length === 5) break;
            }
        }
        if (monsterIndices.length >= 5) {
            // Remove 5 monsters from GY and put into Deck
            const selected = [];
            for (let i = monsterIndices.length - 1; i >= 0; i--) {
                const c = p.graveyard.splice(monsterIndices[i], 1)[0];
                selected.push(c);
            }
            p.deck.push(...selected);
            // Shuffle deck
            p.deck.sort(() => Math.random() - 0.5);
            // Draw 2
            const drawn = [];
            for (let i = 0; i < 2; i++) {
                if (p.deck.length > 0) drawn.push(p.deck.pop());
            }
            p.hand.push(...drawn);
            utils.emitDuelLog(duelState.roomId, `🏺 [Pot of Avarice] Baraja 5 monstruos al Deck y roba 2 cartas (${drawn.length} robadas)!`);
        } else {
            utils.emitDuelLog(duelState.roomId, `⚠️ [Pot of Avarice] Requiere al menos 5 monstruos en el Cementerio.`);
        }
    }
};