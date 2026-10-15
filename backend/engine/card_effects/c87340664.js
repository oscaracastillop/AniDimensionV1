/**
 * [Passcode: 87340664] Atomic Firefly
 * Tipo: Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 87340664,
    name: "Atomic Firefly",
    type: "Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - 1000);
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] ¡Efecto inflige 1000 puntos de daño directo al oponente! [LP rival: ${opp.lp}]`, 'effect');
        return { success: true, damage: 1000 };
    },

    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
