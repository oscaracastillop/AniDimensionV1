module.exports = {
    id: 29380133,
    name: "Yado Karu",
    type: "Effect Monster",
    atk: 900, def: 1700, level: 4, race: "Aqua",

    async onPositionChange(context) {
        const { duelState, newPosition, playerKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
            if (player.hand && player.hand.length > 0) {
                const returned = player.hand.pop();
                player.deck = player.deck || [];
                player.deck.unshift(returned);
                effectUtils.emitDuelLog(duelState.roomId, `🐚🔄 [Yado Karu] ¡Pasa a Defensa y coloca '${returned.name || 'Carta'}' en el fondo del Deck!`, 'monster');
                return { success: true, returnedCard: returned.name };
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
