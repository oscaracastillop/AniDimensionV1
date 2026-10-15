module.exports = {
    id: 213326,
    name: "E - Emergency Call",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const heroIdx = p.deck.findIndex(c => (c.name || '').includes('Elemental HERO') || (c.name || '').includes('HÉROE Elemental'));
        if (heroIdx !== -1) {
            const hero = p.deck.splice(heroIdx, 1)[0];
            p.hand.push(hero);
            utils.emitDuelLog(duelState.roomId, `🚨 [E - Emergency Call] ¡Llamada de Emergencia! Añade a ${hero.name} del Deck a la mano.`);
        }
    }
};