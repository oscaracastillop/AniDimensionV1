/**
 * [Passcode: 81480460] Barrel Dragon
 * Tipo: Effect Monster
 */
module.exports = {
    id: 81480460,
    name: "Barrel Dragon",
    type: "Effect Monster",
    atk: 2600,
    def: 2200,
    level: 7,
    race: "Machine",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let heads = 0;
        for (let i = 0; i < 3; i++) {
            if (Math.random() < 0.5) heads++;
        }
        if (heads >= 2) {
            let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const tKey = targetData?.target_player || opponentKey;
            if (targetSlot === undefined || !duelState[tKey]?.monsters?.[targetSlot]) {
                targetSlot = (duelState[opponentKey]?.monsters || []).findIndex(m => m !== null);
            }
            if (targetSlot !== -1 && duelState[tKey]?.monsters?.[targetSlot]) {
                const targetM = duelState[tKey].monsters[targetSlot];
                duelState[tKey].monsters[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, targetM, tKey);
                effectUtils.emitDuelLog(duelState.roomId, `🔫💥 [Barrel Dragon] ¡${heads}/3 Caras! ¡Los cañones disparan y destruyen a "${targetM.card_data ? targetM.card_data.name : 'Monstruo'}"!`, 'effect');
                return { success: true };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🔫 [Barrel Dragon] Falló el disparo (${heads}/3 Caras, requiere 2+).`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
