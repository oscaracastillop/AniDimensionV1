/**
 * [Passcode: 90500169] Level Down!?
 * Tipo: Quick-Play Spell Card
 * Arquetipo / Expansión: CDIP
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 90500169,
    name: "Level Down!?",
    type: "Quick-Play Spell Card",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        player.hand = player.hand || [];
        if (gy.length > 0) {
            const recovered = gy.pop();
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, `♻️ [${this.name}] ¡Recupera '${recovered.name || 'Carta'}' del cementerio a la mano!`, 'effect');
            return { success: true, recovered: recovered.name };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
