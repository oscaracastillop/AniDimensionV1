/**
 * [Passcode: 79575620] Injection Fairy Lily
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 79575620,
    name: "Injection Fairy Lily",
    type: "Effect Monster",
    atk: 400,
    def: 1500,
    level: 3,
    race: "Spellcaster",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 2000) return { canActivate: false, reason: "Se requieren más de 2000 LP para activar." };
            return { canActivate: true };
        },

    async onDamageStep(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 2000) {
                p.lifePoints -= 2000;
                const mon = p.monsters?.[slotIndex];
                if (mon) {
                    mon.currentAtk = (mon.currentAtk !== undefined ? mon.currentAtk : 400) + 3000;
                    effectUtils.emitDuelLog(duelState.roomId, `💉💖 [Injection Fairy Lily] ¡INYECCIÓN POTENCIADORA! Paga 2000 LP (LP: ${p.lifePoints}) y gana +3000 ATK durante el cálculo de daño (ATK: ${mon.currentAtk}).`, 'monster');
                }
                return { success: true };
            }
            return { success: false };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDamageStep({ duelState, playerKey, slotIndex: targetData?.slot_index || 0, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
