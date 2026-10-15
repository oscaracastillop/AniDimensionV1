/**
 * [Passcode: 6104968] Bubonic Vermin
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 6104968,
    name: "Bubonic Vermin",
    type: "Flip Effect Monster",
    atk: 900,
    def: 100,
    level: 3,
    race: "Beast",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const freeSlot = (p.monsters || []).findIndex(m => !m);
            const verminIdx = (p.deck || []).findIndex(c => Number(c.card_id || c.id) === 6104968);

            if (freeSlot !== -1 && verminIdx !== -1) {
                const [summoned] = p.deck.splice(verminIdx, 1);
                summoned.position = 'DEF';
                summoned.faceDown = true;
                p.monsters[freeSlot] = summoned;
                effectUtils.emitDuelLog(duelState.roomId, `🐀 [Bubonic Vermin] ¡EFECTO DE VOLTEO! Invoca de Modo Especial a "Bubonic Vermin" desde el Deck en Posición de Defensa boca abajo.`, 'flip');
            }
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
