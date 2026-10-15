/**
 * [Passcode: 40695128] Maharaghi
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 40695128,
    name: "Maharaghi",
    type: "Spirit Effect Monster",
    atk: 1200,
    def: 1700,
    level: 4,
    race: "Rock",
    attribute: "EARTH",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto de invocación/volteo." }; },

    async onSummonOrFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.deck && p.deck.length > 0) {
                const topCard = p.deck[0];
                effectUtils.emitDuelLog(duelState.roomId, `🗿🔮 [Maharaghi] Mira la carta del tope del Deck: "${topCard.name || topCard.card_data?.name}". Puedes colocarla en el fondo o mantenerla arriba.`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSummonOrFlip({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
