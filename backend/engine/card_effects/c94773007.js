module.exports = {
    id: 94773007,
    name: "Jirai Gumo",
    type: "Effect Monster",
    atk: 2200, def: 100, level: 4, race: "Insect",

    async onAttackDeclare(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        // Lanzamiento de moneda: 50% de probabilidad
        const coinWon = Math.random() >= 0.5;
        if (!coinWon) {
            const currentLp = player.lp !== undefined ? player.lp : 8000;
            const lpCost = Math.floor(currentLp / 2);
            player.lp = currentLp - lpCost;
            effectUtils.emitDuelLog(duelState.roomId, `🕷️🎲 [Jirai Gumo] ¡Moneda fallida en el ataque! El duelista pierde la mitad de sus Life Points (${lpCost} LP) [LP restantes: ${player.lp}].`, 'monster');
            return { success: true, coinWon: false, lpLost: lpCost };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🕷️🎯 [Jirai Gumo] ¡Moneda acertada! Jirai Gumo ataca con su demoledor ATK de 2200 sin costo.`, 'monster');
        return { success: true, coinWon: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onAttackDeclare({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
