/**
 * [Passcode: 8687195] Dreamsprite
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 8687195,
    name: "Dreamsprite",
    type: "Effect Monster",
    atk: 300,
    def: 200,
    level: 2,
    race: "Plant",
    attribute: "LIGHT",
    onAttackedRedirect: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado cuando es atacada." }; },

    async onAttacked(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const otherIdx = (p.monsters || []).findIndex((m, idx) => m && idx !== slotIndex);
            if (otherIdx !== -1) {
                effectUtils.emitDuelLog(duelState.roomId, `🧚🌿 [Dreamsprite] ¡Al ser atacada, redirige el objetivo del ataque a "${p.monsters[otherIdx].name || p.monsters[otherIdx].card_data?.name}"!`, 'monster');
                return { success: true, newTargetSlot: otherIdx };
            }
            return { success: false };
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
