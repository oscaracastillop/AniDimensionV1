/**
 * [Passcode: 98434877] Suijin
 * Tipo: Effect Monster
 */
module.exports = {
    id: 98434877,
    name: "Suijin",
    type: "Effect Monster",
    atk: 2500,
    def: 2400,
    level: 7,
    race: "Aqua",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🌊 [Suijin] ¡El dios del agua reduce el ataque rival a 0!`, 'effect'); return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
