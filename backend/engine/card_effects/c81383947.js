/**
 * [Passcode: 81383947] White Magician Pikeru
 * Tipo: Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 81383947,
    name: "White Magician Pikeru",
    type: "Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 400;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +400 Life Points! [LP actual: ${player.lp}]`, 'effect');
        return { success: true, healed: 400 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
