/**
 * [Passcode: 59560625] Shift
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 59560625,
    name: "Shift",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            const monsterCount = (duelState[playerKey]?.monsters || []).filter(m => m).length;
            if (monsterCount < 2) return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para cambiar el objetivo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔄🔀 [Shift] ¡Cambia el objetivo del efecto del rival a otro monstruo de tu campo!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
