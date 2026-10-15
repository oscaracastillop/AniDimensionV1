/**
 * [Passcode: 35346968] Solemn Wishes
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 35346968,
    name: "Solemn Wishes",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.solemnWishesActive = duelState.solemnWishesActive || {};
            duelState.solemnWishesActive[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `🕊️💖 [Solemn Wishes] ¡Deseos Solemnes activo! Ganas 500 Life Points cada vez que robes carta(s).`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
