/**
 * [Passcode: 98239899] Blast with Chain
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 98239899,
    name: "Blast with Chain",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para equipar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const targetMon = (p.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + 500;
                targetMon.equippedBlastWithChain = true;
                effectUtils.emitDuelLog(duelState.roomId, `⛓️💣 [Blast with Chain] Equipada a "${targetMon.name || targetMon.card_data?.name}". Gana +500 ATK. Si esta carta es destruida por efecto, destruye 1 carta en el campo.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
