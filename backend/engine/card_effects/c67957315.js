/**
 * [Passcode: 67957315] Spirit Ryu
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 67957315,
    name: "Spirit Ryu",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 4,
    race: "Dragon",
    attribute: "WIND",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragonInHand = (p?.hand || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragonInHand) return { canActivate: false, reason: "Requiere descartar 1 monstruo Dragón de la mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const dIdx = (p.hand || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'dragon');
            if (dIdx !== -1) {
                const discarded = p.hand.splice(dIdx, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 67957315);
                if (selfSlot !== -1 && p.monsters[selfSlot]) {
                    p.monsters[selfSlot].currentAtk = (p.monsters[selfSlot].currentAtk || 1000) + 1000;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Spirit Ryu] Descarta a "${discarded.name || discarded.card_data?.name}" y gana +1000 ATK durante el cálculo de daño (ATK: ${p.monsters[selfSlot].currentAtk}).`, 'monster');
                }
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
