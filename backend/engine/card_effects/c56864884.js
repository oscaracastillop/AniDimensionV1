module.exports = {
    id: 85306040,
    name: "Goblin Elite Attack Force",
    type: "EFFECT_MONSTER",
    onAttackEnd: (duelState, monster, utils) => {
        monster.position = 'defense';
        monster.canChangePositionUntilTurn = (duelState.turnCount || 1) + 2;
        utils.emitDuelLog(duelState.roomId, `🛡️ [Goblin Elite Attack Force] Cambia a Posición de Defensa tras atacar y no puede cambiar hasta el final de tu próximo turno.`);
    }
};