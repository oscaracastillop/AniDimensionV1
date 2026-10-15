/**
 * [Passcode: 32539892] Minar
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 32539892,
    name: "Minar",
    type: "Effect Monster",
    atk: 850,
    def: 750,
    level: 3,
    race: "Insect",
    attribute: "EARTH",

    async onDiscardedByOpponent(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const opp = duelState[opponentKey];
        if (opp) {
            opp.lp = Math.max(0, (opp.lp || 8000) - 1000);
            effectUtils.emitDuelLog(duelState.roomId, `🦗💥 [${this.name}] ¡Descartada por efecto del rival! Inflige 1000 de daño a ${opp.username} (LP: ${opp.lp}).`, 'damage');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
