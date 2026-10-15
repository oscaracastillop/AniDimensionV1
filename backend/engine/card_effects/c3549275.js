/**
 * [Passcode: 3549275] Dice Jar
 * Tipo: Flip Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 3549275,
    name: "Dice Jar",
    type: "Flip Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - 6000);
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] ¡Efecto inflige 6000 puntos de daño directo al oponente! [LP rival: ${opp.lp}]`, 'effect');
        return { success: true, damage: 6000 };
    },

    
    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        opp.lp = Math.max(0, (opp.lp !== undefined ? opp.lp : 8000) - 6000);
        effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] ¡Efecto inflige 6000 puntos de daño directo al oponente! [LP rival: ${opp.lp}]`, 'effect');
        return { success: true, damage: 6000 };
    },
    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip) return this.onFlip(context);
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
