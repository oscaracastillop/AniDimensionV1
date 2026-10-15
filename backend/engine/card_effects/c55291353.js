module.exports = {
    id: 99861526,
    name: "Submarineroid",
    type: "EFFECT_MONSTER",
    directAttack: true,
    onInflictBattleDamage: (duelState, monster, utils) => {
        monster.position = 'defense';
        utils.emitDuelLog(duelState.roomId, `🚢 [Submarineroid] ¡Ataque directo completado! Se sumerge a Posición de Defensa.`);
    }
};