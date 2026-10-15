module.exports = {
    id: 56840658,
    name: "Poison Draw Frog",
    type: "EFFECT_MONSTER",
    onDestroyToGraveyard: (duelState, playerKey, utils) => {
        const p = duelState[playerKey];
        if (p.deck.length > 0) {
            const drawn = p.deck.pop();
            p.hand.push(drawn);
            utils.emitDuelLog(duelState.roomId, `🐸 [Poison Draw Frog] ¡Enviada al cementerio! Roba 1 carta.`);
        }
    }
};