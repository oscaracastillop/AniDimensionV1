/**
 * [Passcode: 90925163] Dancing Fairy
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 90925163,
    name: "Dancing Fairy",
    type: "Effect Monster",
    atk: 1700,
    def: 1000,
    level: 4,
    race: "Fairy",
    attribute: "WIND",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },

    async onStandbyPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && (mon.position === 'face-up-defense' || mon.position === 'defense')) {
                p.lifePoints = (p.lifePoints || 0) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🧚‍♀️✨ [Dancing Fairy] En Posición de Defensa boca arriba: Aumenta los LP en 1000 (LP: ${p.lifePoints}).`, 'monster');
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
