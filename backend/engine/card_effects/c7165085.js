/**
 * [Passcode: 7165085] Bait Doll
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 7165085,
    name: "Bait Doll",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasFaceDown = (duelState[oppKey]?.spells || []).some(s => s && s.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa boca abajo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s && s.faceDown);
            if (sIdx !== -1) {
                const target = opp.spells[sIdx];
                target.faceDown = false;
                effectUtils.emitDuelLog(duelState.roomId, `🎎⚡ [Bait Doll] ¡Fuerza la activación de "${target.card_data?.name || 'Carta Oculta'}"! Si el momento no es el correcto, es destruida. Esta carta se baraja en tu Deck.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
