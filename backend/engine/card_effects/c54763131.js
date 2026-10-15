module.exports = {
    id: 32723153,
    name: "Magical Explosion",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        if ((p.hand || []).length === 0) {
            const spellsInGy = (p.graveyard || []).filter(c => c && c.type && c.type.toLowerCase().includes('spell')).length;
            const dmg = spellsInGy * 200;
            opp.lp = Math.max(0, (opp.lp || 8000) - dmg);
            utils.emitDuelLog(duelState.roomId, `💥 [Magical Explosion] ¡Detonación Arcana! ${spellsInGy} magias en cementerio = ${dmg} daño directo!`);
        }
    }
};