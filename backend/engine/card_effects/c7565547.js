/**
 * [Passcode: 7565547] Collected Power
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 7565547,
    name: "Collected Power",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceUpMon = allMonsters.some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "No hay monstruos boca arriba para recibir los equipos." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🌀🛡️ [Collected Power] ¡Poder Recolectado reubica todas las Cartas de Equipo en el monstruo seleccionado!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
