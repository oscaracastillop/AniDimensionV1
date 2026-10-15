module.exports = {
    id: 47084486,
    name: "Vanity's Fiend",
    type: "EFFECT_MONSTER",
    preventsSpecialSummonAll: true,
    onSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        duelState.vanitysFiendActive = true;
        utils.emitDuelLog(duelState.roomId, `🚫 [Vanity's Fiend] ¡Demonio de la Vanidad bloquea todas las Invocaciones Especiales de ambos jugadores!`);
    }
};