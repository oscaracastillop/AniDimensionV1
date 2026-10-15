/**
 * [Passcode: 4031928] Change of Heart
 * Tipo: Normal Spell
 */
module.exports = {
    id: 4031928,
    name: "Change of Heart",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        if (targetSlot === undefined || !duelState[opponentKey]?.monsters?.[targetSlot]) {
            targetSlot = (duelState[opponentKey]?.monsters || []).findIndex(m => m !== null);
        }
        if (targetSlot !== -1 && duelState[opponentKey]?.monsters?.[targetSlot]) {
            const emptyUserSlot = duelState[playerKey].monsters.findIndex(m => m === null);
            if (emptyUserSlot !== -1) {
                const stolenMonster = duelState[opponentKey].monsters[targetSlot];
                duelState[opponentKey].monsters[targetSlot] = null;
                stolenMonster.stolenUntilEndPhase = true;
                stolenMonster.originalController = opponentKey;
                duelState[playerKey].monsters[emptyUserSlot] = stolenMonster;
                effectUtils.calculateMonsterCurrentStats(stolenMonster, duelState, playerKey);
                effectUtils.emitDuelLog(duelState.roomId, `💖✨ [Change of Heart] ¡Toma el control de "${stolenMonster.card_data ? stolenMonster.card_data.name : 'Monstruo'}" hasta la End Phase!`, 'spell');
                return { success: true };
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `💖 [Change of Heart] No hay casillas libres o monstruos para tomar el control.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
