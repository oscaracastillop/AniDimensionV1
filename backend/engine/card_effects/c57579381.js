/**
 * [Passcode: 57579381] Darklord Marie
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 57579381,
    name: "Darklord Marie",
    type: "Effect Monster",
    atk: 1700,
    def: 1200,
    level: 5,
    race: "Fiend",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase desde el Cementerio." }; },

    async onStandbyPhaseGY(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 200;
            effectUtils.emitDuelLog(duelState.roomId, `🖤✨ [Darklord Marie] Desde el Cementerio en Standby Phase: Aumenta tus LP en 200 (LP: ${p.lifePoints}).`, 'monster');
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
