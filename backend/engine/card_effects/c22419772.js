/**
 * [Passcode: 22419772] Fairy Guardian
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 22419772,
    name: "Fairy Guardian",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 3,
    race: "Fairy",
    attribute: "WIND",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasSpellSent = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('spell') && c.sentByOpponentThisTurn);
            if (!hasSpellSent) return { canActivate: false, reason: "No hay cartas Mágicas enviadas a tu Cementerio por el rival este turno." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 22419772);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const sIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('spell') && c.sentByOpponentThisTurn);
            if (sIdx !== -1) {
                const spellCard = p.graveyard.splice(sIdx, 1)[0];
                p.deck.push(spellCard);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🧚 [Fairy Guardian] Se ofrece en tributo y devuelve "${spellCard.name || spellCard.card_data?.name}" al fondo del Deck.`, 'monster');
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
