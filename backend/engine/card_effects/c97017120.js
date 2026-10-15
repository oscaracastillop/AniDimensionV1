/**
 * [Passcode: 97017120] Giant Rat
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 97017120,
    name: "Giant Rat",
    type: "Effect Monster",
    atk: 1400,
    def: 1450,
    level: 4,
    race: "Beast",
    attribute: "EARTH",
    isSearcher: true,

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p && p.deck) {
            const foundIdx = p.deck.findIndex(c => {
                const cd = c?.card_data || c;
                return (cd?.attribute === 'EARTH') && (cd?.atk <= 1500);
            });
            if (foundIdx !== -1) {
                const summoned = p.deck.splice(foundIdx, 1)[0];
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (freeSlot !== -1) {
                    p.monsters[freeSlot] = {
                        id: summoned.id || summoned.card_id,
                        card_id: summoned.id || summoned.card_id,
                        name: summoned.name,
                        atk: summoned.atk,
                        def: summoned.def,
                        position: 'ATK',
                        faceDown: false,
                        card_data: summoned.card_data || summoned
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, `🔍✨ [${this.name}] ¡Destruido en batalla! Invoca de Modo Especial a "${summoned.name}" (${summoned.atk} ATK) desde el Deck.`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
