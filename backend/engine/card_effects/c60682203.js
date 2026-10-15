/**
 * [Passcode: 60682203] Cold Wave
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 60682203,
    name: "Cold Wave",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            if (duelState.turnPhase !== 'MAIN_1' && duelState.phase !== 'MAIN_1') {
                return { canActivate: false, reason: "Solo se puede activar al inicio de la Main Phase 1." };
            }
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.coldWaveActiveUntilTurn = (duelState.turnNumber || 1) + 1;
            effectUtils.emitDuelLog(duelState.roomId, `❄️🌊 [Cold Wave] ¡Una ola congelante azota el campo! Ningún jugador puede jugar ni colocar cartas Mágicas ni de Trampa hasta el próximo turno.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
