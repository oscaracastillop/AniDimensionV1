module.exports = {
    id: 3659803,
    name: "Overload Fusion",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `⚡ [Overload Fusion] ¡Fusión de Sobrecarga! Destierra materiales Máquina de OSCURIDAD del Campo o Cementerio.`);
    }
};