/**
 * [Passcode: 53530069] Spirit of the Breeze
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 53530069,
    name: "Spirit of the Breeze",
    type: "Effect Monster",
    atk: 0,
    def: 1800,
    level: 3,
    race: "Fairy",
    attribute: "WIND",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },

    async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && (mon.position === 'face-up-attack' || mon.position === 'attack')) {
                p.lifePoints = (p.lifePoints || 0) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🍃✨ [Spirit of the Breeze] En Posición de Ataque boca arriba: Aumenta los LP en 1000 (LP: ${p.lifePoints}).`, 'monster');
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
