/**
 * [Passcode: 77910045] Fatal Abacus
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 77910045,
    name: "Fatal Abacus",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧮 [Fatal Abacus] Trampa continua activa: Cada vez que un monstruo del campo sea enviado al Cementerio, su dueño recibe 500 de daño.`, 'trap');
            return { success: true };
        },

    async onMonsterSentToGraveyard(context) {
            const { duelState, ownerKey, effectUtils } = context;
            const owner = duelState[ownerKey];
            if (owner) {
                owner.lifePoints = Math.max(0, (owner.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🧮💀 [Fatal Abacus] ¡Un monstruo fue enviado al Cementerio! ${owner.username} recibe 500 de daño (LP: ${owner.lifePoints}).`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
