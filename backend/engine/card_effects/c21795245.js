module.exports = {
    id: 88820235,
    name: "Elemental HERO Shining Phoenix Enforcer",
    type: "FUSION_MONSTER",
    battleImmunity: true,
    getAtk: (monster, duelState, playerKey) => {
        const p = duelState[playerKey];
        const eHeroCount = (p.graveyard || []).filter(c => (c.name || '').includes('Elemental HERO') || (c.name || '').includes('HÉROE Elemental')).length;
        return (monster.originalAtk || 2500) + (eHeroCount * 300);
    },
    onBattleDestroyAttempt: (duelState, monster, utils) => {
        utils.emitDuelLog(duelState.roomId, `🔥 [Elemental HERO Shining Phoenix Enforcer] ¡Inmortal como el fénix, no puede ser destruido en batalla!`);
        return false;
    }
};