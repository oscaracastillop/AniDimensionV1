/**
 * [Passcode: 31785398] Ready for Intercepting
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 31785398,
    name: "Ready for Intercepting",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasTarget = (duelState[playerKey]?.monsters || []).some(m => m && ['warrior', 'spellcaster'].includes((m.race || m.card_data?.race || '').toLowerCase())) ||
                              (duelState[oppKey]?.monsters || []).some(m => m && ['warrior', 'spellcaster'].includes((m.race || m.card_data?.race || '').toLowerCase()));
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos Guerrero o Lanzador de Conjuros en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let flipped = false;
            [duelState[oppKey], duelState[playerKey]].forEach(player => {
                if (flipped) return;
                const m = (player?.monsters || []).find(mon => mon && ['warrior', 'spellcaster'].includes((mon.race || mon.card_data?.race || '').toLowerCase()));
                if (m) {
                    m.position = 'face-down-defense';
                    m.faceDown = true;
                    flipped = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🛡️🔄 [Ready for Intercepting] Cambia a "${m.name || m.card_data?.name}" a Posición de Defensa boca abajo.`, 'trap');
                }
            });
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
