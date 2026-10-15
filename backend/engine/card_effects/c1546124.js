module.exports = {
    id: 1546123,
    name: "Cyber End Dragon",
    type: "FUSION_MONSTER",
    piercing: true,
    onSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `💥 [Cyber End Dragon] ¡El coloso mecánico entra al campo con Daño de Penetración!`);
    }
};