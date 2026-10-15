/**
 * [Passcode: 49587034] Lightforce Sword
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 49587034,
    name: "Lightforce Sword",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            if ((duelState[oppKey]?.hand || []).length === 0) return { canActivate: false, reason: "El rival no tiene cartas en la mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            if (!opp || opp.hand.length === 0) return { success: false, reason: "Mano vacía." };
            const randIdx = Math.floor(Math.random() * opp.hand.length);
            const [banished] = opp.hand.splice(randIdx, 1);
            effectUtils.sendCardToBanished(duelState, banished, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, `🗡️✨ [Lightforce Sword] Destierra 1 carta al azar de la mano del rival boca abajo durante 3 turnos.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
