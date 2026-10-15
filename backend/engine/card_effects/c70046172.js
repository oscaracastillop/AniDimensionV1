/**
 * [Passcode: 70046172] Rush Recklessly
 * Tipo: Quick-Play Spell | Expansión: MRL
 */
module.exports = {
    id: 70046172,
    name: "Rush Recklessly",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "No hay monstruos boca arriba para aplicar el aumento." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || playerKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[targetSlot];

        if (targetMon) {
            if (!targetMon.attachedEffects) targetMon.attachedEffects = [];
            targetMon.attachedEffects.push({
                card_id: this.id,
                card_name: this.name,
                atkDelta: 700,
                defDelta: 0,
                turnApplied: duelState.turnNumber
            });
            effectUtils.calculateMonsterCurrentStats(targetMon, duelState, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, `🐗⚡ [${this.name}] ¡"${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}" gana +700 ATK hasta el final del turno!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
