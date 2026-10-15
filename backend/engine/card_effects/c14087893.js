module.exports = {
    id: 14087893,
    name: "Book of Moon",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Quick-Play",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const oppMonsters = opp.monsters || [];

        let flipped = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            const m = oppMonsters[i];
            if (m && !m.faceDown) {
                m.faceDown = true;
                m.position = 'DEF';
                flipped = m;
                break;
            }
        }
        if (flipped) {
            effectUtils.emitDuelLog(duelState.roomId, `📖🌙 [Book of Moon] ¡Libro de la Luna sumerge a '${flipped.name}' en un profundo sueño boca abajo en Posición de Defensa!`, 'spell');
            return { success: true, target: flipped.name };
        }
        effectUtils.emitDuelLog(duelState.roomId, `📖🌙 [Book of Moon] ¡El Libro de la Luna ilumina el campo de batalla!`, 'spell');
        return { success: true };
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
