/**
 * [Passcode: 24068492] Just Desserts (MRD-090)
 * Tipo: NORMAL_TRAP
 * Descripción: Inflige 500 puntos de daño a tu adversario por cada monstruo que controle.
 */
module.exports = {
    id: 24068492,
    name: "Just Desserts",
    set: "MRD-090",
    type: "NORMAL_TRAP",
    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
            const opp = duelState[opponentKey];
            const count = opp.monsters.filter(m => m !== null).length;
            const dmg = count * 500;
            opp.lp = Math.max(0, opp.lp - dmg);
            utils.emitDuelLog(duelState.roomId, `🍰💥 [Just Desserts] ¡${opp.username} recibe ${dmg} de daño (${count} monstruos x 500 LP)! (LP: ${opp.lp})`, 'battle');
            utils.checkDuelGameOver(duelState.roomId, duelState);
            return { success: true };
        }
};
