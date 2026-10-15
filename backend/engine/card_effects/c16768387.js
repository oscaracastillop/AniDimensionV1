/**
 * [Passcode: 16768387] Big Eye
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 16768387,
    name: "Big Eye",
    type: "Flip Effect Monster",
    atk: 1200,
    def: 1000,
    level: 4,
    race: "Fiend",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [Big Eye] ¡EFECTO DE VOLTEO! Mira y reorganiza las 5 cartas superiores de su mazo.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
