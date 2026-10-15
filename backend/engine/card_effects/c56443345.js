module.exports = {
    id: 71218746,
    name: "Drillroid",
    type: "EFFECT_MONSTER",
    onAttackDeclare: (duelState, attacker, defender, playerKey, opponentKey, utils) => {
        if (defender && (defender.position === 'defense' || defender.position === 'set')) {
            const opp = duelState[opponentKey];
            const idx = opp.monsters.indexOf(defender);
            if (idx !== -1) {
                opp.graveyard.push(defender);
                opp.monsters[idx] = null;
                duelState.skipDamageCalculation = true;
                utils.emitDuelLog(duelState.roomId, `🔩 [Drillroid] ¡Taladra y destruye a ${defender.name || 'monstruo en defensa'} sin cálculo de daño!`);
            }
        }
    }
};