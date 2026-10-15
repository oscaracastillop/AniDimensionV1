/**
 * [Passcode: 24140059] A Cat of Ill Omen
 * Tipo: Flip Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 24140059,
    name: "A Cat of Ill Omen",
    type: "Flip Effect Monster",
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

    
    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
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
        if (context.isFlip) return this.onFlip(context);
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
