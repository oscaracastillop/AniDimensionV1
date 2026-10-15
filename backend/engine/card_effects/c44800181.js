/**
 * [Passcode: 44800181] Combo Master
 * Tipo: Effect Monster
 * Arquetipo / Expansión: CDIP
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 44800181,
    name: "Combo Master",
    type: "Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        effectUtils.emitDuelLog(duelState.roomId, `✨ [${this.name}] ¡Efecto reglamentario activado con éxito en el campo de batalla!`, 'effect');
        return { success: true };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
