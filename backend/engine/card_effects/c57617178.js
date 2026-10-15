/**
 * [Passcode: 57617178] Sonic Bird
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 57617178,
    name: "Sonic Bird",
    type: "Effect Monster",
    atk: 1400,
    def: 1000,
    level: 4,
    race: "Winged Beast",
    attribute: "WIND",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const ritIdx = p.deck.findIndex(c => {
                const t = (c?.type || c?.card_data?.type || '').toLowerCase();
                return t.includes('ritual') && (t.includes('spell') || t.includes('mágica'));
            });
            if (ritIdx !== -1) {
                const added = p.deck.splice(ritIdx, 1)[0];
                p.hand.push(added);
                p.mainDeckCount = p.deck.length;
                effectUtils.emitDuelLog(duelState.roomId, `🦅✨ [${this.name}] ¡Añade a "${added.name || 'Magia de Ritual'}" del Deck a la mano!`, 'search');
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
