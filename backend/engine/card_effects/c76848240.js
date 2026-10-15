/**
 * [Passcode: 76848240] Non Aggression Area
 * Tipo: Normal Trap
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 76848240,
    name: "Non Aggression Area",
    type: "Normal Trap",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.hand = opp.hand || [];
        opp.graveyard = opp.graveyard || [];
        let discarded = null;
        if (opp.hand.length > 0) {
            discarded = opp.hand.pop();
            opp.graveyard.push(discarded);
            effectUtils.emitDuelLog(duelState.roomId, `🗑️ [${this.name}] ¡Hace descartar 1 carta de la mano rival (${discarded.name}) al cementerio!`, 'effect');
            return { success: true, discarded: discarded.name };
        }
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
