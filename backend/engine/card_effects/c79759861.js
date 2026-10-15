/**
 * [Passcode: 79759861] Tribute to The Doomed
 * Tipo: Normal Spell
 */
module.exports = {
    id: 79759861,
    name: "Tribute to The Doomed",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const p = duelState[playerKey];
        if (p.hand && p.hand.length > 0) {
            const disc = p.hand.pop();
            effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
            let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const tKey = targetData?.target_player || opponentKey;
            if (targetSlot === undefined || !duelState[tKey]?.monsters?.[targetSlot]) {
                targetSlot = (duelState[opponentKey]?.monsters || []).findIndex(m => m !== null);
            }
            if (targetSlot !== -1 && duelState[tKey]?.monsters?.[targetSlot]) {
                const targetM = duelState[tKey].monsters[targetSlot];
                duelState[tKey].monsters[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, targetM, tKey);
                effectUtils.emitDuelLog(duelState.roomId, `💀💥 [Tribute to The Doomed] ¡Descarta 1 carta y destruye a "${targetM.card_data ? targetM.card_data.name : 'Monstruo'}"!`, 'spell');
                return { success: true };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💀 [Tribute to The Doomed] No hay cartas para descartar o monstruo objetivo.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
