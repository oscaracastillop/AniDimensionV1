/**
 * [Passcode: 84926738] The Immortal of Thunder
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 84926738,
    name: "The Immortal of Thunder",
    type: "Flip Effect Monster",
    atk: 1500,
    def: 1300,
    level: 4,
    race: "Thunder",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + 3000;
        effectUtils.emitDuelLog(duelState.roomId, `⚡💖 [The Immortal of Thunder] ¡EFECTO DE VOLTEO! Recupera 3000 Life Points.`, 'heal');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
