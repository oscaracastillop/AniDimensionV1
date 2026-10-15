/**
 * [Passcode: 53582587] Torrential Tribute
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 53582587,
    name: "Torrential Tribute",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,
    isMonsterBoardWipe: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const totalMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m).length;
            if (totalMonsters === 0) return { canActivate: false, reason: "No hay monstruos en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let count = 0;
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m) {
                        duelState[pKey].monsters[idx] = null;
                        effectUtils.sendCardToGraveyard(duelState, m, pKey);
                        count++;
                    }
                });
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌊💥 [Torrential Tribute] ¡Tributo Torrencial! Una ola gigante arrasa con todos los monstruos del campo, destruyendo ${count} monstruo(s).`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
