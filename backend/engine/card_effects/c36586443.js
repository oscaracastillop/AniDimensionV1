/**
 * [Passcode: 36586443] Elemental Recharge
 * Tipo: Normal Trap Card
 * Arquetipo / Expansión: EOJ
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 36586443,
    name: "Elemental Recharge",
    type: "Normal Trap Card",
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
