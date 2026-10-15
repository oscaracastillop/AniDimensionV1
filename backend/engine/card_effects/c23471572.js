/**
 * [Passcode: 23471572] Solomon's Lawbook
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 23471572,
    name: "Solomon's Lawbook",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.skipNextStandbyPhase = duelState.skipNextStandbyPhase || {};
            duelState.skipNextStandbyPhase[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `📖⏳ [Solomon's Lawbook] ¡Te saltarás la próxima Standby Phase!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
