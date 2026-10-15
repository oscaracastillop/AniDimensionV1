/**
 * [Passcode: 84080938] The Forgiving Maiden
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 84080938,
    name: "The Forgiving Maiden",
    type: "Effect Monster",
    atk: 850,
    def: 2000,
    level: 4,
    race: "Fairy",
    attribute: "LIGHT",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDeadMon = (p?.graveyard || []).some(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (!hasDeadMon) return { canActivate: false, reason: "No hay monstruos destruidos en batalla este turno en el Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 84080938);
            if (selfSlot !== -1) {
                const selfMon = p.monsters[selfSlot];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[selfSlot] = null;
            }
            const gyIdx = (p.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && c.destroyedByBattleThisTurn);
            if (gyIdx !== -1) {
                const mon = p.graveyard.splice(gyIdx, 1)[0];
                p.hand.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️ [The Forgiving Maiden] Se ofrece en tributo y regresa a "${mon.name || mon.card_data?.name}" a la mano.`, 'monster');
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
