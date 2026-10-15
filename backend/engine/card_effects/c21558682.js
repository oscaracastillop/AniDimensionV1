/**
 * [Passcode: 21558682] Jam Defender
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 21558682,
    name: "Jam Defender",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const hasRevivalJam = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown && (m.card_data?.name || m.name || '').toLowerCase().includes('revival jam'));
            if (!hasRevivalJam) return { canActivate: false, reason: "Debes controlar un \"Revival Jam\" boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.jamDefenderActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `🧪🛡️ [Jam Defender] ¡Defensor de Slimes activo! Redirige cualquier ataque dirigido a tus monstruos hacia "Revival Jam".`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
