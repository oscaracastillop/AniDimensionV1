/**
 * [Passcode: 72405967] Royal Tribute
 * Tipo: Normal Spell
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 72405967,
    name: "Royal Tribute",
    type: "Normal Spell",
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
