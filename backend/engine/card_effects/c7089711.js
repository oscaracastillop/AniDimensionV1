/**
 * [Passcode: 7089711] Hane-Hane
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 7089711,
    name: "Hane-Hane",
    type: "Flip Effect Monster",
    atk: 450,
    def: 500,
    level: 2,
    race: "Beast",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, opponentKey, targetData, effectUtils } = context;
        const tPlayerKey = targetData?.target_player || opponentKey;
        let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;

        let targetMonster = null;
        if (targetSlot !== undefined && duelState[tPlayerKey]?.monsters?.[targetSlot]) {
            targetMonster = duelState[tPlayerKey].monsters[targetSlot];
        } else {
            const oppSlots = (duelState[opponentKey]?.monsters || []).map((m, idx) => m ? { m, idx, pKey: opponentKey } : null).filter(Boolean);
            const playerSlots = (duelState[playerKey]?.monsters || []).map((m, idx) => m ? { m, idx, pKey: playerKey } : null).filter(Boolean);
            const pick = oppSlots[0] || playerSlots[0];
            if (pick) {
                targetMonster = pick.m;
                targetSlot = pick.idx;
            }
        }

        if (targetMonster && targetSlot !== undefined) {
            const mName = targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo';
            duelState[tPlayerKey].monsters[targetSlot] = null;
            if (effectUtils && typeof effectUtils.cleanAttachedEquipsAndContinuousEffects === 'function') {
                effectUtils.cleanAttachedEquipsAndContinuousEffects(duelState, targetMonster, tPlayerKey);
            }
            if (effectUtils && typeof effectUtils.cleanupOrphanedEquipCards === 'function') {
                effectUtils.cleanupOrphanedEquipCards(duelState);
            }
            const returnCard = targetMonster.card_data ? { ...targetMonster.card_data } : targetMonster;
            duelState[tPlayerKey].hand = duelState[tPlayerKey].hand || [];
            duelState[tPlayerKey].hand.push(returnCard);
            effectUtils.emitDuelLog(duelState.roomId, `🦔🔄 [${this.name}] ¡EFECTO DE VOLTEO! Regresa a "${mName}" a la mano de su dueño.`, 'effect');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🦔 [${this.name}] ¡EFECTO DE VOLTEO! No hay ningún monstruo en el campo para regresar a la mano.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
