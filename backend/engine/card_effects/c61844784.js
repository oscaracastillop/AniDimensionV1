/**
 * [Passcode: 61844784] Magic Reflector
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 61844784,
    name: "Magic Reflector",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasCard = (duelState[playerKey]?.spells || []).some(s => s) ||
                            (duelState[oppKey]?.spells || []).some(s => s);
            if (!hasCard) return { canActivate: false, reason: "No hay cartas Mágicas o Trampas en el campo para colocar un contador." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const s = (p.spells || []).find(card => card && Number(card.card_id || card.card_data?.id) !== 61844784);
            if (s) {
                s.hasReflectorCounter = true;
                effectUtils.emitDuelLog(duelState.roomId, `🛡️✨ [Magic Reflector] Coloca un Contador Reflector en "${s.name || s.card_data?.name}". La próxima vez que vaya a ser destruida, el contador se remueve en su lugar.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
