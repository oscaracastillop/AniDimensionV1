module.exports = {
    id: 18325492,
    name: "Gyroid",
    type: "EFFECT_MONSTER",
    battleDestructionImmunityOnce: true,
    onBattleDestroyAttempt: (duelState, monster, utils) => {
        if (!monster.gyroidShieldUsed) {
            monster.gyroidShieldUsed = true;
            utils.emitDuelLog(duelState.roomId, `🚁 [Gyroid] ¡Sus hélices resisten la primera destrucción en batalla este turno!`);
            return false; // prevent destruction
        }
        return true;
    }
};