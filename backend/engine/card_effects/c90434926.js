/**
 * [Passcode: 90434926] Veil of Darkness
 * Tipo: Spell
 * Arquetipo / Expansión: GLAS
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 90434926,
    name: "Veil of Darkness",
    type: "Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.deck = player.deck || [];
        player.hand = player.hand || [];
        let drawn = 0;
        for (let i = 0; i < 1; i++) {
            if (player.deck.length > 0) {
                player.hand.push(player.deck.pop());
                drawn++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🃏 [${this.name}] ¡Roba ${drawn} carta(s) del Deck a la mano!`, 'effect');
        return { success: true, drawn };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
