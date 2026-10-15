/**
 * [Passcode: 14291024] Gradius' Option
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 14291024,
    name: "Gradius' Option",
    type: "Effect Monster",
    atk: 0,
    def: 0,
    level: 1,
    race: "Machine",
    attribute: "LIGHT",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasGradius = (p?.monsters || []).some(m => m && Number(m.card_id || m.card_data?.id) === 10992251); // Gradius
            if (!hasGradius) return { canActivate: false, reason: "Debes controlar 1 \"Gradius\" boca arriba en tu campo." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const gradius = (p.monsters || []).find(m => m && Number(m.card_id || m.card_data?.id) === 10992251);
            if (gradius && p.monsters[slotIndex]) {
                const opt = p.monsters[slotIndex];
                opt.currentAtk = gradius.currentAtk !== undefined ? gradius.currentAtk : 1200;
                opt.currentDef = gradius.currentDef !== undefined ? gradius.currentDef : 800;
                effectUtils.emitDuelLog(duelState.roomId, `🚀✨ [Gradius' Option] Invocada Especialmente. Copia los stats de Gradius (ATK: ${opt.currentAtk} / DEF: ${opt.currentDef}).`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
