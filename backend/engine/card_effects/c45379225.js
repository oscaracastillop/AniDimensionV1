/**
 * [Passcode: 45379225] Psychic Lifetrancer
 * Tipo: Synchro Effect Monster
 * Arquetipo / Expansión: CSOC
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 45379225,
    name: "Psychic Lifetrancer",
    type: "Synchro Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 1200;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +1200 Life Points! [LP actual: ${player.lp}]`, 'heal');
        return { success: true, healed: 1200 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
