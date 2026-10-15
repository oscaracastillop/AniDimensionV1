/**
 * [Passcode: 37580756] Michizure
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 37580756,
    name: "Michizure",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isMonsterRemoval: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const targetSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m);
            if (targetSlot !== -1 && opp.monsters?.[targetSlot]) {
                const targetMon = opp.monsters[targetSlot];
                opp.monsters[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, targetMon, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌊💀 [Michizure] ¡Arrastra a "${targetMon.card_data?.name || 'Monstruo'}" al Cementerio tras la destrucción de tu monstruo!`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
