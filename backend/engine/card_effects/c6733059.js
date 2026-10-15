/**
 * [Passcode: 6733059] Skull Lair
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 6733059,
    name: "Skull Lair",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const gyCount = (duelState[playerKey]?.graveyard || []).length;
            if (gyCount === 0) return { canActivate: false, reason: "No tienes cartas en el Cementerio para desterrar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `💀🕳️ [Skull Lair] ¡Guarida de las Calaveras activa! Destierra monstruos de tu Cementerio para destruir 1 monstruo en el campo de ese mismo Nivel.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
