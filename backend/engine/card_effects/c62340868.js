/**
 * [Passcode: 62340868] Kazejin
 * Tipo: Effect Monster
 */
module.exports = {
    id: 62340868,
    name: "Kazejin",
    type: "Effect Monster",
    atk: 2400,
    def: 2200,
    level: 7,
    race: "Spellcaster",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🌪️ [Kazejin] ¡El dios del viento frena el impacto enemigo!`, 'effect'); return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
