/**
 * [Passcode: 76218643] Black Potan
 * Tipo: Effect Monster
 * Arquetipo / Expansión: ABPF
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 76218643,
    name: "Black Potan",
    type: "Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 800;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +800 Life Points! [LP actual: ${player.lp}]`, 'heal');
        return { success: true, healed: 800 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
