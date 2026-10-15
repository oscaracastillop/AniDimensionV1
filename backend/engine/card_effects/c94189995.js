module.exports = {
    id: 36042004,
    name: "Babycerasaurus",
    type: "EFFECT_MONSTER",
    onDestroyByEffect: (duelState, playerKey, utils) => {
        const p = duelState[playerKey];
        const slot = p.monsters.findIndex(m => m === null);
        if (slot !== -1) {
            const dinoIdx = p.deck.findIndex(c => (c.race === 'Dinosaur' || (c.type && c.type.toLowerCase().includes('dinosaur'))) && (c.level || 0) <= 4);
            if (dinoIdx !== -1) {
                const summoned = p.deck.splice(dinoIdx, 1)[0];
                summoned.position = 'attack';
                p.monsters[slot] = summoned;
                utils.emitDuelLog(duelState.roomId, `🦖 [Babycerasaurus] ¡Cría destruida por efecto! Invoca a ${summoned.name} desde el Deck!`);
            }
        }
    }
};