module.exports = {
    id: 67095270,
    name: "Dimension Wall",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        duelState.dimensionWallActive = true;
        duelState.dimensionWallTarget = opponentKey;
        utils.emitDuelLog(duelState.roomId, `🌀 [Dimension Wall] ¡El daño de combate de este ataque se redirige al adversario!`);
    }
};