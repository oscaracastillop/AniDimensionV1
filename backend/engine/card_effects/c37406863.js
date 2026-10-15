/**
 * [Passcode: 37406863] Fengsheng Mirror
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 37406863,
    name: "Fengsheng Mirror",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (!opp?.hand || opp.hand.length === 0) return { canActivate: false, reason: "El rival no tiene cartas en su mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            let discarded = 0;
            for (let i = opp.hand.length - 1; i >= 0; i--) {
                const c = opp.hand[i];
                if ((c.type || '').includes('Spirit') || (c.card_data?.type || '').includes('Spirit')) {
                    opp.hand.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, oppKey);
                    discarded++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪞💨 [Fengsheng Mirror] Revela la mano del rival y descarta ${discarded} monstruos Spirit al Cementerio.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
