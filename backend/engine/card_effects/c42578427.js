/**
 * [Passcode: 42578427] Eatgaboon
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 42578427,
    name: "Eatgaboon",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const targetMon = targetData?.card || targetData?.monster;
        if (targetMon && (targetMon.atk <= 500 || (targetMon.card_data && targetMon.card_data.atk <= 500))) {
            const slot = targetData?.slotIndex !== undefined ? targetData.slotIndex : 0;
            if (duelState[oppKey]?.monsters[slot]) {
                effectUtils.sendCardToGraveyard(duelState, duelState[oppKey].monsters[slot], oppKey);
                duelState[oppKey].monsters[slot] = null;
                effectUtils.emitDuelLog(duelState.roomId, `🐊⚡ [${this.name}] ¡Eatgaboon devora y destruye al monstruo recién invocado con 500 o menos ATK!`, 'trap');
            }
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
