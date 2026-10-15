module.exports = {
    id: 10248389,
    name: "Cyber Blader",
    type: "FUSION_MONSTER",
    getAtk: (monster, duelState, playerKey) => {
        const oppKey = playerKey === 'player' ? 'opponent' : 'player';
        const oppCount = (duelState[oppKey].monsters || []).filter(m => m !== null).length;
        if (oppCount === 2) {
            return (monster.originalAtk || 2100) * 2;
        }
        return monster.originalAtk || 2100;
    },
    onBattleDestroyAttempt: (duelState, monster, utils) => {
        const oppCount = (duelState.opponent.monsters || []).filter(m => m !== null).length;
        if (oppCount === 1) {
            utils.emitDuelLog(duelState.roomId, `⛸️ [Cyber Blader] ¡Inmune a destrucción en batalla (el rival controla 1 monstruo)!`);
            return false;
        }
        return true;
    }
};