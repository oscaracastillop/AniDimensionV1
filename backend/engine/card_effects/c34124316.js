/**
 * [Passcode: 34124316] Cyber Jar
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 34124316,
    name: "Cyber Jar",
    type: "Flip Effect Monster",
    atk: 900,
    def: 900,
    level: 3,
    race: "Rock",
    attribute: "DARK",
    isFlip: true,
    isMonsterBoardWipe: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        // 1. Destruir todos los monstruos en el campo
        let destroyed = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    if (p.monsters[i]) {
                        effectUtils.sendCardToGraveyard(duelState, p.monsters[i], pk);
                        p.monsters[i] = null;
                        destroyed++;
                    }
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `🏺💥 [Volteo: ${this.name}] ¡Ciberjarra destruye todos los monstruos en el campo (${destroyed} destruidos)!`, 'flip');

        // 2. Ambos jugadores excavan 5 cartas de su Deck
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p && p.deck && p.deck.length > 0) {
                const count = Math.min(5, p.deck.length);
                const drawn = p.deck.splice(0, count);
                drawn.forEach(c => {
                    const cd = c?.card_data || c;
                    const lv = cd?.level || 1;
                    const isMon = (cd?.type || '').toLowerCase().includes('monster');
                    const freeSlot = p.monsters.findIndex(m => m === null);
                    if (isMon && lv <= 4 && freeSlot !== -1) {
                        p.monsters[freeSlot] = {
                            id: cd.id,
                            card_id: cd.id,
                            name: cd.name,
                            atk: cd.atk,
                            def: cd.def,
                            position: 'ATK',
                            faceDown: false,
                            card_data: cd
                        };
                    } else {
                        p.hand.push(c);
                    }
                });
                p.mainDeckCount = p.deck.length;
            }
        });

        effectUtils.emitDuelLog(duelState.roomId, `🏺✨ [Volteo: ${this.name}] Ambos duelistas revelan las 5 cartas superiores de su Deck e Invocan monstruos de Nivel 4 o menor.`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
