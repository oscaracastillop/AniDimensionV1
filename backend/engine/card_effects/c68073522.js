/**
 * [Passcode: 68073522] Soul Absorption
 * Tipo: Continuous Spell
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 68073522,
    name: "Soul Absorption",
    type: "Continuous Spell",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        player.lp = (player.lp !== undefined ? player.lp : 8000) + 500;
        effectUtils.emitDuelLog(duelState.roomId, `💖 [${this.name}] ¡Efecto restaura +500 Life Points! [LP actual: ${player.lp}]`, 'effect');
        return { success: true, healed: 500 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
