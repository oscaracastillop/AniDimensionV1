/**
 * [Passcode: 94163677] Infinite Cards
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 94163677,
    name: "Infinite Cards",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.infiniteCardsActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `♾️🃏 [Infinite Cards] ¡Cartas Infinitas activas! Se elimina el límite de 6 cartas en la mano para ambos duelistas.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
