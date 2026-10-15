/**
 * [Passcode: 66719324] Rain of Mercy
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 66719324,
    name: "Rain of Mercy",
    type: "Normal Spell",
    race: "Spell",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            if (duelState[playerKey]) duelState[playerKey].lp = (duelState[playerKey].lp || 8000) + 1000;
            if (duelState[oppKey]) duelState[oppKey].lp = (duelState[oppKey].lp || 8000) + 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🌧️💖 [Rain of Mercy] ¡Lluvia de misericordia! Ambos jugadores recuperan 1000 Life Points.`, 'heal');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
