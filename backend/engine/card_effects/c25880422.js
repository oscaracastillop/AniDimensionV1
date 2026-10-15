/**
 * [Passcode: 25880422] Block Attack
 * Tipo: Normal Spell
 */
module.exports = {
    id: 25880422,
    name: "Block Attack",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        if (targetSlot === undefined || !duelState[opponentKey]?.monsters?.[targetSlot]) {
            targetSlot = (duelState[opponentKey]?.monsters || []).findIndex(m => m && !m.faceDown && m.position === 'ATK');
        }
        if (targetSlot !== -1 && duelState[opponentKey]?.monsters?.[targetSlot]) {
            const m = duelState[opponentKey].monsters[targetSlot];
            m.position = 'DEF';
            effectUtils.calculateMonsterCurrentStats(m, duelState, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🛡️ [Block Attack] ¡"${m.card_data ? m.card_data.name : 'Monstruo'}" es cambiado a Posición de Defensa!`, 'spell');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🛡️ [Block Attack] No hay monstruos en ataque en el campo rival.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
