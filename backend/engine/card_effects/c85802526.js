/**
 * [Passcode: 85802526] Cure Mermaid
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 85802526,
    name: "Cure Mermaid",
    type: "Effect Monster",
    atk: 1500,
    def: 800,
    level: 4,
    race: "Fish",
    attribute: "WATER",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de Standby Phase." }; },

    async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 800;
            effectUtils.emitDuelLog(duelState.roomId, `🧜‍♀️💧 [Cure Mermaid] Durante tu Standby Phase: Aumenta tus LP en 800 (LP: ${p.lifePoints}).`, 'monster');
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
