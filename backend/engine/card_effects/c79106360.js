/**
 * [Passcode: 79106360] Morphing Jar #2
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 79106360,
    name: "Morphing Jar #2",
    type: "Flip Effect Monster",
    atk: 800,
    def: 700,
    level: 3,
    race: "Rock",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');

            [playerKey, oppKey].forEach(pKey => {
                const p = duelState[pKey];
                let returnedCount = 0;
                (p.monsters || []).forEach((m, idx) => {
                    if (m) {
                        p.deck.push(m);
                        p.monsters[idx] = null;
                        returnedCount++;
                    }
                });
                p.deck.sort(() => Math.random() - 0.5);
                // Reinvocar la misma cantidad
                for (let i = 0; i < returnedCount; i++) {
                    const monIdx = p.deck.findIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
                    if (monIdx !== -1) {
                        const [summoned] = p.deck.splice(monIdx, 1);
                        summoned.position = 'DEF';
                        summoned.faceDown = true;
                        p.monsters[i] = summoned;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🏺🌀 [Morphing Jar #2] ¡EFECTO DE VOLTEO! Todos los monstruos regresan a los Decks y ambos jugadores excavan e invocan nuevos monstruos boca abajo.`, 'flip');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
