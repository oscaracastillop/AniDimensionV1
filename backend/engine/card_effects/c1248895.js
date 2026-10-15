/**
 * [Passcode: 1248895] Chain Destruction
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 1248895,
    name: "Chain Destruction",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const targetMon = targetData?.target_card || (opp?.monsters || []).find(m => m && !m.faceDown && (m.currentAtk || m.card_data?.atk || 0) <= 2000);
            if (!targetMon) return { success: false, reason: "Monstruo de 2000 o menos ATK no encontrado." };

            const targetId = Number(targetMon.card_id || targetMon.card_data?.id);
            let destroyedCount = 0;

            // Destruir copias de la mano
            for (let i = opp.hand.length - 1; i >= 0; i--) {
                if (Number(opp.hand[i].card_id || opp.hand[i].id) === targetId) {
                    const [c] = opp.hand.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, opponentKey);
                    destroyedCount++;
                }
            }
            // Destruir copias del Deck
            for (let i = opp.deck.length - 1; i >= 0; i--) {
                if (Number(opp.deck[i].card_id || opp.deck[i].id) === targetId) {
                    const [c] = opp.deck.splice(i, 1);
                    effectUtils.sendCardToGraveyard(duelState, c, opponentKey);
                    destroyedCount++;
                }
            }

            effectUtils.emitDuelLog(duelState.roomId, `⛓️💥 [Chain Destruction] ¡Destruye ${destroyedCount} copia(s) de "${targetMon.card_data?.name || 'Monstruo'}" de la mano y Deck del rival!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
