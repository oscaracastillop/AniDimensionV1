/**
 * [Passcode: 61622107] Bubble Crash
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 61622107,
    name: "Bubble Crash",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const pCount = (duelState.player1?.monsters || []).filter(m => m).length + (duelState.player1?.spells || []).filter(s => s).length + (duelState.player1?.hand || []).length;
            const oppCount = (duelState.player2?.monsters || []).filter(m => m).length + (duelState.player2?.spells || []).filter(s => s).length + (duelState.player2?.hand || []).length;
            if (pCount <= 5 && oppCount <= 5) return { canActivate: false, reason: "Ningún jugador tiene más de 5 cartas entre mano y campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🫧💥 [Bubble Crash] ¡Estallido de burbujas! Ambos jugadores reducen sus cartas en mano y campo hasta tener un máximo de 3 cada uno.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
