/**
 * [Passcode: 95286165] De-Fusion
 * Tipo: Quick-Play Spell | Expansión: LON
 */
module.exports = {
    id: 95286165,
    name: "De-Fusion",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFusion = allMonsters.some(m => m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion'));
            if (!hasFusion) return { canActivate: false, reason: "No hay monstruos de Fusión boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let target = null;
            let tKey = playerKey;
            let tIdx = -1;

            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion')) {
                    target = m; tIdx = idx; tKey = playerKey;
                }
            });
            if (!target) {
                (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion')) {
                        target = m; tIdx = idx; tKey = oppKey;
                    }
                });
            }

            if (target && tIdx !== -1) {
                duelState[tKey].monsters[tIdx] = null;
                duelState[tKey].extraDeck = duelState[tKey].extraDeck || [];
                duelState[tKey].extraDeck.push(target);
                effectUtils.emitDuelLog(duelState.roomId, `🌀🔄 [De-Fusion] ¡Desfusión! Devuelve a "${target.card_data?.name || 'Fusión'}" al Deck Extra y puede reintegrar sus materiales al campo.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
