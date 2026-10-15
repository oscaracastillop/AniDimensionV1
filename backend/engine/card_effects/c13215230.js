module.exports = {
    id: 13215230,
    name: "Dream Clown",
    type: "Effect Monster",
    atk: 1200, def: 900, level: 3, race: "Warrior",

    async onPositionChange(context) {
        const { duelState, newPosition, opponentKey, effectUtils } = context;
        if (newPosition === 'DEF') {
            const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
            const oppMonsters = opp.monsters || [];
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i]) {
                    const destroyed = oppMonsters[i];
                    effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
                    oppMonsters[i] = null;
                    effectUtils.emitDuelLog(duelState.roomId, `🤡💥 [Dream Clown] ¡Al cambiar a Posición de Defensa, destruye a '${destroyed.name}' en el campo rival!`, 'monster');
                    return { success: true, destroyed: destroyed.name };
                }
            }
        }
        return { success: true };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onPositionChange({ duelState, newPosition: 'DEF', opponentKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
