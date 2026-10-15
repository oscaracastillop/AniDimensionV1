/**
 * [Passcode: 94425169] Spring of Rebirth
 * Tipo: Continuous Spell | Expansión: LOD
 */
module.exports = {
    id: 94425169,
    name: "Spring of Rebirth",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⛲ [Spring of Rebirth] Magia continua activa: Recuperas 500 LP cada vez que un monstruo del campo regrese a la mano.`, 'spell');
            return { success: true };
        },

    async onMonsterReturnedToHand(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + 500;
            effectUtils.emitDuelLog(duelState.roomId, `⛲✨ [Spring of Rebirth] Un monstruo regresó del campo a la mano: Aumenta tus LP en 500 (LP: ${p.lifePoints}).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
