/**
 * [Passcode: 99517131] The Spell Absorbing Life
 * Tipo: Normal Trap
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 99517131,
    name: "The Spell Absorbing Life",
    type: "Normal Trap",
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
