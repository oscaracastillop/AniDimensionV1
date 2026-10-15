/**
 * [Passcode: 98299011] Gift of The Mystical Elf
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 98299011,
    name: "Gift of The Mystical Elf",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const totalMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m).length;
            const gain = totalMonsters * 300;
            duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + gain;
            effectUtils.emitDuelLog(duelState.roomId, `🧝‍♀️💖 [Gift of The Mystical Elf] ¡Recupera ${gain} Life Points (300 x ${totalMonsters} monstruos en campo)!`, 'heal');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
