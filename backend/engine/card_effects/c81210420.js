/**
 * [Passcode: 81210420] Magical Hats
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 81210420,
    name: "Magical Hats",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const monIdx = (p.monsters || []).findIndex(m => m && !m.faceDown);
            if (monIdx !== -1) {
                p.monsters[monIdx].faceDown = true;
                p.monsters[monIdx].position = 'DEF';
            }
            effectUtils.emitDuelLog(duelState.roomId, `🎩✨ [Magical Hats] ¡Sombreros Mágicos ocultan a tu monstruo en Posición de Defensa boca abajo!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
