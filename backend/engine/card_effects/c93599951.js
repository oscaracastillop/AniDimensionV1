/**
 * [Passcode: 93599951] Dark Spirit of the Silent
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 93599951,
    name: "Dark Spirit of the Silent",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasAttacker = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasAttacker) return { canActivate: false, reason: "No hay atacantes." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🛑 [Dark Spirit of the Silent] ¡Detiene el ataque y fuerza a otro monstruo rival a declarar un ataque!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
