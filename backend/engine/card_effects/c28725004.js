module.exports = {
    id: 28725004,
    name: "Tainted Wisdom",
    type: "Effect Monster",
    atk: 1250, def: 800, level: 3, race: "Fiend",

    async onPositionChange(context) {
        const { duelState, newPosition, playerKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
            if (player.deck && player.deck.length > 0) {
                // Barajar Deck
                player.deck.sort(() => Math.random() - 0.5);
                effectUtils.emitDuelLog(duelState.roomId, `🧠🔀 [Tainted Wisdom] ¡Sabiduría Corrupta pasa a Defensa y baraja completamente el Deck de su controlador!`, 'monster');
                return { success: true, shuffled: true };
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'DEF', playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
