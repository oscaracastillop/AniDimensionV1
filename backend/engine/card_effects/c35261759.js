module.exports = {
    id: 45906428,
    name: "Miracle Fusion",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `✨ [Miracle Fusion] ¡Fusión Milagrosa! Destierra materiales del Campo o Cementerio para Invocar un HÉROE Elemental.`);
    }
};