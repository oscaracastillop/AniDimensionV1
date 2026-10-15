/**
 * [Passcode: 27770341] Super Rejuvenation
 * Tipo: Quick-Play Spell | Expansión: LOD
 */
module.exports = {
    id: 27770341,
    name: "Super Rejuvenation",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            p.activeSuperRejuvenation = true;
            effectUtils.emitDuelLog(duelState.roomId, `🐉✨ [Super Rejuvenation] Activada: En la End Phase robarás 1 carta por cada monstruo Dragón descartado o tributado este turno.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
