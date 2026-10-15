/**
 * [Passcode: 43385557] Magical Android
 * Tipo: Synchro Effect Monster
 * Arquetipo / Expansión: TDGS
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 43385557,
    name: "Magical Android",
    type: "Synchro Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 600;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +600 Life Points! [LP actual: ${player.lp}]`, 'heal');
        return { success: true, healed: 600 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
