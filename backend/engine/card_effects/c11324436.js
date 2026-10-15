/**
 * [Passcode: 11324436] Electric Snake
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 11324436,
    name: "Electric Snake",
    type: "Effect Monster",
    atk: 800,
    def: 1200,
    level: 3,
    race: "Thunder",
    attribute: "LIGHT",

    async onDiscardedByOpponent(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            for (let i = 0; i < 2; i++) {
                if (p.deck.length > 0) p.hand.push(p.deck.pop());
            }
            p.mainDeckCount = p.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, `⚡🃏 [${this.name}] ¡Descartada por efecto del rival! ${p.username} roba 2 cartas.`, 'draw');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
