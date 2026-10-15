/**
 * [Passcode: 87102774] Golden Ladybug
 * Tipo: Effect
 * Arquetipo / Expansión: LODT
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 87102774,
    name: "Golden Ladybug",
    type: "Effect",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 500;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +500 Life Points! [LP actual: ${player.lp}]`, 'heal');
        return { success: true, healed: 500 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
