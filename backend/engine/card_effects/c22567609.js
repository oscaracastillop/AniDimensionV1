/**
 * [Passcode: 22567609] Nimble Momonga
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 22567609,
    name: "Nimble Momonga",
    type: "Effect Monster",
    atk: 1000,
    def: 100,
    level: 2,
    race: "Beast",
    attribute: "EARTH",

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p) {
            p.lp = (p.lp || 8000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🐿️💚 [${this.name}] ¡Destruido en batalla! ${p.username} recupera 1000 LP (LP: ${p.lp}).`, 'heal');

            for (let i = 0; i < 2; i++) {
                const mIdx = p.deck.findIndex(c => Number(c?.card_id || c?.id || c || 0) === 22567609);
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (mIdx !== -1 && freeSlot !== -1) {
                    const momo = p.deck.splice(mIdx, 1)[0];
                    p.monsters[freeSlot] = {
                        id: 22567609,
                        card_id: 22567609,
                        name: "Nimble Momonga",
                        atk: 1000,
                        def: 100,
                        position: 'DEF',
                        faceDown: true,
                        card_data: momo.card_data || momo
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, `🐿️✨ [${this.name}] ¡Coloca de Modo Especial a "Nimble Momonga" boca abajo desde el Deck!`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
