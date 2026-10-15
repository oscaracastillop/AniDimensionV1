module.exports = {
    id: 15150365,
    name: "White Magical Hat",
    type: "Effect Monster",
    atk: 1000, def: 700, level: 3, race: "Spellcaster",

    async onBattleDamage(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        if (opp.hand && opp.hand.length > 0) {
            const randIdx = Math.floor(Math.random() * opp.hand.length);
            const discarded = opp.hand.splice(randIdx, 1)[0];
            opp.graveyard = opp.graveyard || [];
            opp.graveyard.push(discarded);
            effectUtils.emitDuelLog(duelState.roomId, `🎩✨ [White Magical Hat] ¡Infligió daño de batalla! Descarta 1 carta aleatoria de la mano rival (${discarded.name || 'Carta'}).`, 'monster');
            return { success: true, discardedCard: discarded.name };
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onBattleDamage({ duelState, opponentKey, effectUtils });
    },
    async execute(context) {
        return this.onBattleDamage(context);
    }
};
