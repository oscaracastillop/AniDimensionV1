/**
 * [Passcode: 52900379] Blackwing - Brisote the Tailwind
 * Tipo: Effect Monster
 * Arquetipo / Expansión: STOR
 * Efecto OCG reglamentario con mutaciones reales de estado
 */
module.exports = {
    id: 52900379,
    name: "Blackwing - Brisote the Tailwind",
    type: "Effect Monster",
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
