/**
 * [Passcode: 18605135] Tornado Wall
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 18605135,
    name: "Tornado Wall",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (!hasUmi) return { canActivate: false, reason: "Solo se puede activar mientras \"Umi\" esté activo en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.tornadoWallActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌪️🌊 [Tornado Wall] ¡Muro de Tornados activo! Todo el daño de batalla recibido se reduce a 0 mientras Umi permanezca en el campo.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
