module.exports = {
    id: 58071123,
    name: "Oxygeddon",
    type: "EFFECT_MONSTER",
    onDestroyByBattle: (duelState, attacker, defender, playerKey, opponentKey, utils) => {
        if (attacker && (attacker.race === 'Pyro' || (attacker.type && attacker.type.toLowerCase().includes('pyro')))) {
            const p = duelState[playerKey];
            const opp = duelState[opponentKey];
            p.lp = Math.max(0, (p.lp || 8000) - 800);
            opp.lp = Math.max(0, (opp.lp || 8000) - 800);
            utils.emitDuelLog(duelState.roomId, `💥 [Oxygeddon] ¡Reacción explosiva con Piro! Inflige 800 de daño a ambos jugadores!`);
        }
    }
};