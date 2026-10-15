module.exports = {
    id: 41436536,
    name: "Elemental HERO Phoenix Enforcer",
    type: "FUSION_MONSTER",
    battleImmunity: true,
    onBattleDestroyAttempt: (duelState, monster, utils) => {
        utils.emitDuelLog(duelState.roomId, `🦅 [Elemental HERO Phoenix Enforcer] ¡Resiste la destrucción en batalla!`);
        return false;
    }
};