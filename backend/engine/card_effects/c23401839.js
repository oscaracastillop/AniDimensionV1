/**
 * [Passcode: 23401839] Senju of the Thousand Hands
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 23401839,
    name: "Senju of the Thousand Hands",
    type: "Effect Monster",
    atk: 1400,
    def: 1000,
    level: 4,
    race: "Fairy",
    attribute: "LIGHT",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const ritIdx = p.deck.findIndex(c => {
                const t = (c?.type || c?.card_data?.type || '').toLowerCase();
                return t.includes('ritual') && t.includes('monster');
            });
            if (ritIdx !== -1) {
                const added = p.deck.splice(ritIdx, 1)[0];
                p.hand.push(added);
                p.mainDeckCount = p.deck.length;
                effectUtils.emitDuelLog(duelState.roomId, `🖐️✨ [${this.name}] ¡Añade a "${added.name || 'Monstruo de Ritual'}" del Deck a la mano!`, 'search');
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
