module.exports = {
    id: 13093792,
    name: "Destiny HERO - Diamond Dude",
    type: "EFFECT_MONSTER",
    onIgnitionEffect: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        if (p.deck.length > 0) {
            const topCard = p.deck.pop();
            if (topCard.type && topCard.type.toLowerCase().includes('normal') && topCard.type.toLowerCase().includes('spell')) {
                p.graveyard.push(topCard);
                utils.emitDuelLog(duelState.roomId, `💎 [Destiny HERO - Diamond Dude] ¡Excava la Magia Normal "${topCard.name}" y la envía al Cementerio para activar su efecto el próximo turno!`);
            } else {
                p.deck.unshift(topCard);
                utils.emitDuelLog(duelState.roomId, `💎 [Destiny HERO - Diamond Dude] La carta superior no era Magia Normal (${topCard.name}). Se coloca al fondo del Deck.`);
            }
        }
    }
};