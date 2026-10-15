/**
 * [Passcode: 81863068] Hiro's Shadow Scout
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 81863068,
    name: "Hiro's Shadow Scout",
    type: "Flip Effect Monster",
    atk: 650,
    def: 500,
    level: 2,
    race: "Fiend",
    attribute: "DARK",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp && opp.deck) {
            let discardedSpells = 0;
            const drawCount = Math.min(3, opp.deck.length);
            for (let i = 0; i < drawCount; i++) {
                const drawn = opp.deck.pop();
                const type = (drawn?.type || drawn?.card_data?.type || '').toLowerCase();
                if (type.includes('spell') || type.includes('mágica')) {
                    effectUtils.sendCardToGraveyard(duelState, drawn, oppKey);
                    discardedSpells++;
                } else {
                    opp.hand.push(drawn);
                }
            }
            opp.mainDeckCount = opp.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, `🕵️✨ [Volteo: ${this.name}] ¡El rival roba ${drawCount} cartas y descarta ${discardedSpells} Magias al Cementerio!`, 'flip');
        }
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
