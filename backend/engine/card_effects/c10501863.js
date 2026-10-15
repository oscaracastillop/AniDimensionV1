module.exports = {
    id: 10526791,
    name: "Elemental HERO Wildedge",
    type: "FUSION_MONSTER",
    canAttackAllMonsters: true,
    onSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `🌪️ [Elemental HERO Wildedge] ¡Puede atacar a TODOS los monstruos del oponente una vez cada uno!`);
    }
};