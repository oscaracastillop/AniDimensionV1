module.exports = {
    id: 44883830,
    name: "Des Croaking",
    type: "NORMAL_SPELL",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const p = duelState[playerKey];
        const opp = duelState[opponentKey];
        const desFrogCount = (p.monsters || []).filter(m => m && (m.name === 'Des Frog' || m.card_id === 84451804 || m.id === 84451804)).length;
        if (desFrogCount >= 3) {
            let destroyed = 0;
            for (let i = 0; i < 5; i++) {
                if (opp.monsters[i]) {
                    opp.graveyard.push(opp.monsters[i]);
                    opp.monsters[i] = null;
                    destroyed++;
                }
                if (opp.spells[i]) {
                    opp.graveyard.push(opp.spells[i]);
                    opp.spells[i] = null;
                    destroyed++;
                }
            }
            utils.emitDuelLog(duelState.roomId, `🐸 [Des Croaking] ¡Coro mortal de 3 Des Frog! Destruye todas las cartas (${destroyed}) del oponente!`);
        } else {
            utils.emitDuelLog(duelState.roomId, `⚠️ [Des Croaking] Requiere 3 "Des Frog" boca arriba en el campo.`);
        }
    }
};