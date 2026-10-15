/**
 * [Passcode: 43711255] Prohibition
 * Tipo: Continuous Spell | Expansión: PSV
 */
module.exports = {
    id: 43711255,
    name: "Prohibition",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredCard = targetData?.declared_card || "Jinzo";
            duelState.prohibitionDeclaredCard = declaredCard.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `🚫📜 [Prohibition] ¡Se declara la prohibición de "${declaredCard}"! Dicha carta no puede ser jugada.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
