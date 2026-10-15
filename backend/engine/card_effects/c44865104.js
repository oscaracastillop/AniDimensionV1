module.exports = {
    id: 44676200,
    name: "Hero Barrier",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const hasHero = (p.monsters || []).some(m => m && ((m.name || '').includes('Elemental HERO') || (m.name || '').includes('HÉROE Elemental')));
        if (hasHero) {
            duelState.attackNegated = true;
            utils.emitDuelLog(duelState.roomId, `🛡️ [Hero Barrier] ¡Barrera de Héroe activada! El ataque del oponente ha sido negado.`);
        }
    }
};