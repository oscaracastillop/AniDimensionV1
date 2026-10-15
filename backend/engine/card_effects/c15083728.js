/**
 * [Passcode: 15083728] House of Adhesive Tape
 * Tipo: Normal Trap | Expansión: MRL
 */
module.exports = {
    id: 15083728,
    name: "House of Adhesive Tape",
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
        if (targetMon && (targetMon.def <= 500 || (targetMon.card_data && targetMon.card_data.def <= 500))) {
            const slot = targetData?.slotIndex !== undefined ? targetData.slotIndex : 0;
            if (duelState[oppKey]?.monsters[slot]) {
                effectUtils.sendCardToGraveyard(duelState, duelState[oppKey].monsters[slot], oppKey);
                duelState[oppKey].monsters[slot] = null;
                effectUtils.emitDuelLog(duelState.roomId, `📦⚡ [${this.name}] ¡Casa de Cinta Adhesiva destruye al monstruo recién invocado con 500 o menos DEF!`, 'trap');
            }
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
