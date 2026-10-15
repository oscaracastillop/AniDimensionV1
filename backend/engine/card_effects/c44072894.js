/**
 * [Passcode: 44072894] Supply
 * Tipo: Flip Effect Monster | Expansión: LON
 */
module.exports = {
    id: 44072894,
    name: "Supply",
    type: "Flip Effect Monster",
    atk: 1300,
    def: 800,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            let retrieved = 0;
            if (p.graveyard && p.graveyard.length > 0) {
                // Recuperar hasta 2 monstruos de material de fusión del cementerio a la mano
                const validMats = [];
                for (let i = p.graveyard.length - 1; i >= 0 && validMats.length < 2; i--) {
                    const card = p.graveyard[i];
                    if (card && (card.type || '').toLowerCase().includes('monster')) {
                        validMats.push(i);
                    }
                }
                validMats.forEach(idx => {
                    const c = p.graveyard.splice(idx, 1)[0];
                    p.hand.push(c);
                    retrieved++;
                });
            }
            effectUtils.emitDuelLog(duelState.roomId, `📦 [Supply] ¡VOLTEO! Recupera ${retrieved} monstruos de material del Cementerio a la mano.`, 'flip');
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
