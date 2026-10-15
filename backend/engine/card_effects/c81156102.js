module.exports = {
    id: 27581098,
    name: "Non-Fusion Area",
    type: "CONTINUOUS_TRAP",
    preventsFusion: true,
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `🚫 [Non-Fusion Area] ¡Campo anti-fusión activo! Ningún jugador puede invocar monstruos por Fusión.`);
    }
};