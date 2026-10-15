/**
 * [Passcode: 596051] Snake Fang
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 596051,
    name: "Snake Fang",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "No hay monstruos boca arriba para aplicar la reducción." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tPlayerKey = targetData?.target_player || oppKey;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const targetMon = duelState[tPlayerKey]?.monsters[targetSlot];

        if (targetMon) {
            if (!targetMon.attachedEffects) targetMon.attachedEffects = [];
            targetMon.attachedEffects.push({
                card_id: this.id,
                card_name: this.name,
                atkDelta: 0,
                defDelta: -500,
                turnApplied: duelState.turnNumber
            });
            effectUtils.calculateMonsterCurrentStats(targetMon, duelState, tPlayerKey);
            effectUtils.emitDuelLog(duelState.roomId, `🐍⚡ [${this.name}] ¡Colmillo de Serpiente reduce en 500 la DEF de "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}"!`, 'trap');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
