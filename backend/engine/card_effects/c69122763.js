/**
 * [Passcode: 69122763] Deal of Phantom
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 69122763,
    name: "Deal of Phantom",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceUpMon = allMonsters.some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const targetMon = (duelState[playerKey]?.monsters || []).find(m => m && !m.faceDown) || (duelState[oppKey]?.monsters || []).find(m => m && !m.faceDown);
            const gyCount = (duelState[playerKey]?.graveyard || []).length;
            const bonus = gyCount * 100;
            if (targetMon) {
                targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + bonus;
                effectUtils.emitDuelLog(duelState.roomId, `👻📈 [Deal of Phantom] ¡Aumenta el ATK de "${targetMon.card_data?.name || 'Monstruo'}" en ${bonus} puntos (${gyCount} cartas en tu Cementerio x 100)!`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
