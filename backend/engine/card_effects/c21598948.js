/**
 * [Passcode: 21598948] Fairy Box
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 21598948,
    name: "Fairy Box",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fairyBoxActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `📦🧚 [Fairy Box] ¡Caja del Hada activa! Cuando un monstruo rival ataque, lanza una moneda: si sale cara, el ATK del atacante se reduce a 0. Mantenimiento: 500 LP.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
