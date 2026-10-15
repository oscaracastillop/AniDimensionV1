/**
 * [Passcode: 95178994] Giant Germ
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95178994,
    name: "Giant Germ",
    type: "Effect Monster",
    atk: 1000,
    def: 100,
    level: 2,
    race: "Fiend",
    attribute: "DARK",

    async onDestroyedByBattle(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (opp) {
            opp.lp = Math.max(0, (opp.lp || 8000) - 500);
            effectUtils.emitDuelLog(duelState.roomId, `🦠💥 [${this.name}] ¡Destruido en batalla! Inflige 500 de daño a ${opp.username} (LP: ${opp.lp}).`, 'damage');
        }

        const p = duelState[playerKey];
        if (p && p.deck) {
            for (let i = 0; i < 2; i++) {
                const gIdx = p.deck.findIndex(c => Number(c?.card_id || c?.id || c || 0) === 95178994);
                const freeSlot = p.monsters.findIndex(m => m === null);
                if (gIdx !== -1 && freeSlot !== -1) {
                    const germ = p.deck.splice(gIdx, 1)[0];
                    p.monsters[freeSlot] = {
                        id: 95178994,
                        card_id: 95178994,
                        name: "Giant Germ",
                        atk: 1000,
                        def: 100,
                        position: 'ATK',
                        faceDown: false,
                        card_data: germ.card_data || germ
                    };
                    p.mainDeckCount = p.deck.length;
                    effectUtils.emitDuelLog(duelState.roomId, `🦠✨ [${this.name}] ¡Invoca de Modo Especial a "Giant Germ" en Ataque desde el Deck!`, 'summon');
                }
            }
        }
    },

    async execute(context) {
        return { success: true };
    }
};
