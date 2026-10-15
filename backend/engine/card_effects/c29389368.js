/**
 * [Passcode: 29389368] Nutrient Z
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 29389368,
    name: "Nutrient Z",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return { success: true };
        },

    async onBattleDamageCalculated(context) {
            const { duelState, playerKey, battleDamage, effectUtils } = context;
            const p = duelState[playerKey];
            if (battleDamage >= 2000) {
                p.lifePoints = (p.lifePoints || 0) + 4000;
                effectUtils.emitDuelLog(duelState.roomId, `🧪✨ [Nutrient Z] ¡Iba a recibir ${battleDamage} de daño de batalla! Aumenta sus LP en 4000 antes de recibir el daño (LP: ${p.lifePoints}).`, 'trap');
                return { success: true };
            }
            return { success: false };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
