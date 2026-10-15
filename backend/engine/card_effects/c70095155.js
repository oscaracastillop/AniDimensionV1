module.exports = {
    id: 70095154,
    name: "Cyber Dragon",
    type: "EFFECT_MONSTER",
    canSpecialSummon: (duelState, playerKey, opponentKey) => {
        const player = duelState[playerKey];
        const opp = duelState[opponentKey];
        const pMonsterCount = (player.monsters || []).filter(m => m !== null).length;
        const oppMonsterCount = (opp.monsters || []).filter(m => m !== null).length;
        return pMonsterCount === 0 && oppMonsterCount > 0;
    },
    onSpecialSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        utils.emitDuelLog(duelState.roomId, `✨ [Cyber Dragon] ¡Invocado de Modo Especial desde la mano por su efecto!`);
    }
};