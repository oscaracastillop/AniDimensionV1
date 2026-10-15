/**
 * [Passcode: 28358902] Crimson Sentry
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 28358902,
    name: "Crimson Sentry",
    type: "Effect Monster",
    atk: 1500,
    def: 1200,
    level: 4,
    race: "Warrior",
    attribute: "FIRE",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 28358902);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.deck.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🔥 [Crimson Sentry] Se ofrece en tributo y devuelve a "${mon.name || mon.card_data?.name}" al fondo del Deck.`, 'monster');
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
