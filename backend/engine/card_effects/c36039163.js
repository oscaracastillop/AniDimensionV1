/**
 * [Passcode: 36039163] Penguin Knight
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 36039163,
    name: "Penguin Knight",
    type: "Effect Monster",
    atk: 900,
    def: 800,
    level: 3,
    race: "Aqua",
    attribute: "WATER",

    async onSentFromDeckToGY(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.graveyard) {
            while (p.graveyard.length > 0) {
                p.deck.push(p.graveyard.pop());
            }
            p.mainDeckCount = p.deck.length;
            effectUtils.emitDuelLog(duelState.roomId, `🐧♻️ [${this.name}] ¡Enviado del Deck al Cementerio! Todo el Cementerio de ${p.username} es barajado en el Deck.`, 'spell');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
