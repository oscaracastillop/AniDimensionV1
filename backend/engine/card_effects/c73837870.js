/**
 * [Passcode: 73837870] Sunny Pixie
 * Tipo: Tuner Effect Monster
 * Arquetipo / Expansión: ANPR
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 73837870,
    name: "Sunny Pixie",
    type: "Tuner Effect Monster",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 1000;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +1000 Life Points! [LP actual: ${player.lp}]`, 'heal');
        return { success: true, healed: 1000 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
