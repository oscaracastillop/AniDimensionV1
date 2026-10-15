/**
 * [Passcode: 89258225] Winged Minion
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 89258225,
    name: "Winged Minion",
    type: "Effect Monster",
    atk: 700,
    def: 700,
    level: 2,
    race: "Fiend",
    attribute: "DARK",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiend = (p?.monsters || []).some(m => m && Number(m.card_id || m.card_data?.id) !== 89258225 && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (!hasFiend) return { canActivate: false, reason: "Debes controlar otro monstruo Demonio para aumentar su poder." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 89258225);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }
            const targetFiend = (p.monsters || []).find(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (targetFiend) {
                targetFiend.currentAtk = (targetFiend.currentAtk !== undefined ? targetFiend.currentAtk : (targetFiend.card_data?.atk || 0)) + 700;
                targetFiend.currentDef = (targetFiend.currentDef !== undefined ? targetFiend.currentDef : (targetFiend.card_data?.def || 0)) + 700;
                effectUtils.emitDuelLog(duelState.roomId, `🦇✨ [Winged Minion] Se ofrece en tributo y otorga +700 ATK/DEF a "${targetFiend.name || targetFiend.card_data?.name}".`, 'monster');
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
