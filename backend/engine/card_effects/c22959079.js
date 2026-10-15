/**
 * [Passcode: 22959079] Dimensionhole
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 22959079,
    name: "Dimensionhole",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m);
            const target = p.monsters?.[tSlot];
            if (!target) return { success: false, reason: "Monstruo no encontrado." };

            p.monsters[tSlot] = null;
            duelState.dimensionholeReturns = duelState.dimensionholeReturns || [];
            duelState.dimensionholeReturns.push({
                card: target,
                playerKey,
                slotIndex: tSlot,
                returnTurn: (duelState.turnNumber || 1) + 1
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌌🕳️ [Dimensionhole] "${target.card_data?.name || target.name}" es desterrado temporalmente hasta tu próxima Standby Phase.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
