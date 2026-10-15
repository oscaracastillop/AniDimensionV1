/**
 * [Passcode: 33737664] Graverobber's Retribution
 * Tipo: Continuous Trap | Expansión: LON
 */
module.exports = {
    id: 33737664,
    name: "Graverobber's Retribution",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `💀⚖️ [Graverobber's Retribution] En tu Standby Phase inflige 100 de daño al rival por cada uno de sus monstruos desterrados.`, 'trap');
            return { success: true };
        },

    onStandby({ duelState, playerKey, opponentKey, effectUtils }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const banishedCount = (duelState[oppKey]?.banished || []).length;
            const dmg = banishedCount * 100;
            if (dmg > 0 && duelState[oppKey]) {
                duelState[oppKey].lp = Math.max(0, duelState[oppKey].lp - dmg);
                effectUtils.emitDuelLog(duelState.roomId, `💀💥 [Graverobber's Retribution] Inflige ${dmg} de daño (${banishedCount} cartas desterradas x 100 LP). (LP: ${duelState[oppKey].lp})`, 'damage');
            }
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
