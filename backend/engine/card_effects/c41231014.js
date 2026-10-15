module.exports = {
    id: 40418351,
    name: "Cyberdark Dragon",
    type: "FUSION_MONSTER",
    getAtk: (monster, duelState, playerKey) => {
        const p = duelState[playerKey];
        const gyMonstersCount = (p.graveyard || []).filter(c => c && c.type && c.type.toLowerCase().includes('monster')).length;
        let bonus = gyMonstersCount * 100;
        if (monster.equippedDragon) {
            bonus += (monster.equippedDragon.originalAtk || monster.equippedDragon.atk || 0);
        }
        return (monster.originalAtk || 1000) + bonus;
    },
    onSpecialSummon: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const dragonIdx = p.graveyard.findIndex(c => (c.race === 'Dragon' || (c.type && c.type.toLowerCase().includes('dragon'))));
        if (dragonIdx !== -1) {
            const dragon = p.graveyard.splice(dragonIdx, 1)[0];
            const cdd = p.monsters.find(m => m && (m.id === 40418351 || m.card_id === 40418351));
            if (cdd) {
                cdd.equippedDragon = dragon;
                utils.emitDuelLog(duelState.roomId, `🐉⚡ [Cyberdark Dragon] ¡El Dragón Ciberoscuro devora a ${dragon.name} del Cementerio para absorber su poder!`);
            }
        }
    },
    onBattleDestroyAttempt: (duelState, monster, utils) => {
        if (monster.equippedDragon) {
            utils.emitDuelLog(duelState.roomId, `🛡️ [Cyberdark Dragon] ¡Destruye al dragón devorado (${monster.equippedDragon.name}) para evitar su destrucción!`);
            delete monster.equippedDragon;
            return false;
        }
        return true;
    }
};