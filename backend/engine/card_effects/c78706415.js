/**
 * [Passcode: 78706415] Fiber Jar
 * Tipo: Flip Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 78706415,
    name: "Fiber Jar",
    type: "Flip Effect Monster",
    atk: 500,
    def: 500,
    level: 3,
    race: "Plant",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Ambos jugadores barajan mano, campo y cementerio al mazo y roban 5 cartas
            [p, opp].forEach(pl => {
                (pl.monsters || []).forEach(m => { if (m) pl.deck.push(m); });
                pl.monsters = [null, null, null, null, null];
                (pl.spells || []).forEach(s => { if (s) pl.deck.push(s); });
                pl.spells = [null, null, null, null, null];
                (pl.hand || []).forEach(c => { pl.deck.push(c); });
                pl.hand = [];
                (pl.graveyard || []).forEach(c => { pl.deck.push(c); });
                pl.graveyard = [];

                pl.deck.sort(() => Math.random() - 0.5);
                for (let i = 0; i < 5 && pl.deck.length > 0; i++) {
                    pl.hand.push(pl.deck.shift());
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🏺🌀 [Fiber Jar] ¡VOLTEO! ¡REINICIO TOTAL! Ambos jugadores barajan manos, campos y Cementerios a sus Decks y roban 5 cartas nuevas.`, 'flip');
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
