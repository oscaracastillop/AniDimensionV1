/**
 * [Passcode: 24294108] Burning Land
 * Tipo: Continuous Spell | Expansión: PSV
 */
module.exports = {
    id: 24294108,
    name: "Burning Land",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            [playerKey, oppKey].forEach(pKey => {
                if (duelState[pKey]?.fieldSpell) {
                    effectUtils.sendCardToGraveyard(duelState, duelState[pKey].fieldSpell, pKey);
                    duelState[pKey].fieldSpell = null;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌋🔥 [Burning Land] ¡Destruye todas las Cartas de Campo! Ambos jugadores reciben 500 de daño en cada Standby Phase.`, 'spell');
            return { success: true };
        },

    onStandby({ duelState, effectUtils }) {
            ['player1', 'player2'].forEach(pKey => {
                if (duelState[pKey]) {
                    duelState[pKey].lp = Math.max(0, (duelState[pKey].lp || 8000) - 500);
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌋🔥 [Burning Land] Ambos jugadores reciben 500 puntos de daño en la Standby Phase.`, 'damage');
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
