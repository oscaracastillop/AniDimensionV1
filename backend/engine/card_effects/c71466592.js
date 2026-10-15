/**
 * [Passcode: 71466592] Maryokutai
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 71466592,
    name: "Maryokutai",
    type: "Effect Monster",
    atk: 900,
    def: 900,
    level: 3,
    race: "Aqua",
    attribute: "WATER",
    isSpellNegator: true,

    canActivate({ duelState, playerKey }) {
            // Se puede activar en el turno del rival cuando activa una carta mágica
            return { canActivate: true };
        },

    async onNegateSpell(context) {
            const { duelState, playerKey, slotIndex, spellCard, effectUtils } = context;
            const p = duelState[playerKey];
            if (p.monsters && p.monsters[slotIndex]) {
                const selfMon = p.monsters[slotIndex];
                effectUtils.sendCardToGraveyard(duelState, selfMon, playerKey);
                p.monsters[slotIndex] = null;
            }
            effectUtils.emitDuelLog(duelState.roomId, `💧🛡️ [Maryokutai] ¡Se ofrece en tributo! Niega la activación de la Carta Mágica "${spellCard?.name || 'Mágica'}" y la destruye.`, 'monster');
            return { success: true, negated: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onNegateSpell({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
