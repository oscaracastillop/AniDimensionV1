/**
 * [Passcode: 18807108] Spellbinding Circle
 * Tipo: Continuous Trap | Expansión: MRL
 */
module.exports = {
    id: 18807108,
    name: "Spellbinding Circle",
    type: "Continuous Trap",
    race: "Trap",
    isTrap: true,
    isContinuous: true,
    isTargetStun: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const hasMonster = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
        if (!hasMonster) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para paralizar." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const opp = duelState[oppKey];
        const targetMon = opp?.monsters[tSlot];

        if (targetMon) {
            targetMon.isTrapped = true;
            targetMon.cannotAttack = true;
            targetMon.cannotChangePosition = true;
            effectUtils.emitDuelLog(duelState.roomId, `⭕⚡ [${this.name}] ¡Círculo del Hechizo paraliza a "${targetMon.card_data ? targetMon.card_data.name : 'Monstruo'}"! No puede atacar ni cambiar de posición.`, 'trap');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
