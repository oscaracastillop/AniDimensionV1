/**
 * [Passcode: 90147755] Lady Assailant of Flames
 * Tipo: Flip Effect Monster | Expansión: LON
 */
module.exports = {
    id: 90147755,
    name: "Lady Assailant of Flames",
    type: "Flip Effect Monster",
    atk: 1500,
    def: 1000,
    level: 4,
    race: "Pyro",
    attribute: "FIRE",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            
            // Banish top 3 cards from Deck
            const banishedCards = [];
            for (let i = 0; i < 3 && p.deck && p.deck.length > 0; i++) {
                const c = p.deck.shift();
                p.banished = p.banished || [];
                p.banished.push(c);
                banishedCards.push(c);
            }
            
            // Inflict 800 damage
            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Lady Assailant of Flames] ¡VOLTEO! Destierra ${banishedCards.length} cartas del tope del Deck de ${p.username} e inflige 800 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'flip');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
