module.exports = {
    id: 47737087,
    name: "Elemental HERO Rampart Blaster",
    type: "FUSION_MONSTER",
    canAttackDirectInDefense: true,
    defenseDirectAtkMultiplier: 0.5,
    onSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `🛡️ [Elemental HERO Rampart Blaster] ¡Puede atacar directamente en Posición de Defensa con la mitad de su ATK!`);
    }
};