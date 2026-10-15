module.exports = {
    id: 93889755,
    name: "Crass Clown",
    type: "Effect Monster",
    atk: 1350, def: 1400, level: 4, race: "Fiend",

    async onPositionChange(context) {
        const { duelState, newPosition, opponentKey, effectUtils } = context;
        if (newPosition === 'ATK') {
            const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
            const oppMonsters = opp.monsters || [];
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i]) {
                    const bounced = oppMonsters[i];
                    oppMonsters[i] = null;
                    opp.hand = opp.hand || [];
                    opp.hand.push(bounced);
                    effectUtils.emitDuelLog(duelState.roomId, `🤡🔄 [Crass Clown] ¡Al cambiar a Posición de Ataque, regresa a '${bounced.name}' a la mano del rival!`, 'monster');
                    return { success: true, bounced: bounced.name };
                }
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'ATK', opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
