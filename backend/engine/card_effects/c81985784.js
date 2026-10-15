/**
 * [Passcode: 81985784] Des Feral Imp
 * Tipo: Flip Effect Monster
 * Auténtica lógica OCG con mutaciones de estado en el duelo
 */
module.exports = {
    id: 81985784,
    name: "Des Feral Imp",
    type: "Flip Effect Monster",
    atk: 0, def: 0, level: 0, race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        player.hand = player.hand || [];
        if (gy.length > 0) {
            const recovered = gy.pop();
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, `♻️ [${this.name}] ¡Recupera '${recovered.name}' del cementerio a la mano!`, 'effect');
            return { success: true, recovered: recovered.name };
        }
        return { success: true };
    },

    
    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const gy = player.graveyard || [];
        player.hand = player.hand || [];
        if (gy.length > 0) {
            const recovered = gy.pop();
            player.hand.push(recovered);
            effectUtils.emitDuelLog(duelState.roomId, `♻️ [${this.name}] ¡Recupera '${recovered.name}' del cementerio a la mano!`, 'effect');
            return { success: true, recovered: recovered.name };
        }
        return { success: true };
    },
    

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip) return this.onFlip(context);
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
