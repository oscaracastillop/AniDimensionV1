/**
 * [Passcode: 38480590] Lady Panther
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 38480590,
    name: "Lady Panther",
    type: "Effect Monster",
    atk: 1400,
    def: 1300,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 38480590);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.deck.unshift(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🐆 [Lady Panther] Se ofrece en tributo y devuelve a "${mon.name || mon.card_data?.name}" al tope del Deck.`, 'monster');
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
