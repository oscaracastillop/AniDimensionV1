/**
 * [Passcode: 65475294] The Unfriendly Amazon
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 65475294,
    name: "The Unfriendly Amazon",
    type: "Effect Monster",
    atk: 2000,
    def: 1000,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",

    canActivate() { return { canActivate: false, reason: "Efecto de mantenimiento en Standby Phase." }; },

    async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const otherIdx = (p.monsters || []).findIndex((m, idx) => m && idx !== slotIndex);
            if (otherIdx !== -1) {
                const tMon = p.monsters[otherIdx];
                effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
                p.monsters[otherIdx] = null;
                effectUtils.emitDuelLog(duelState.roomId, `🛡️ [The Unfriendly Amazon] Tributa a "${tMon.name || tMon.card_data?.name}" como mantenimiento obligatorio.`, 'monster');
            } else {
                const selfMon = p.monsters[slotIndex];
                if (selfMon) {
                    effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                    p.monsters[slotIndex] = null;
                    effectUtils.emitDuelLog(duelState.roomId, `🛡️💥 [The Unfriendly Amazon] Se destruye al no haber otro monstruo para tributar.`, 'monster');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
