/**
 * [Passcode: 25955164] Sanga of the Thunder
 * Tipo: Effect Monster
 */
module.exports = {
    id: 25955164,
    name: "Sanga of the Thunder",
    type: "Effect Monster",
    atk: 2600,
    def: 2200,
    level: 7,
    race: "Thunder",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `⚡ [Sanga of the Thunder] ¡El poder del trueno protege su posición!`, 'effect'); return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
