/**
 * [Passcode: 1918087] Minor Goblin Official
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 1918087,
    name: "Minor Goblin Official",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👺📜 [Minor Goblin Official] ¡Oficial Goblin activo! Si los LP del rival son 3000 o menos, recibe 500 de daño en cada Standby Phase.`, 'trap');
            return { success: true };
        },

    onStandby({ duelState, opponentKey, effectUtils }) {
            const opp = duelState[opponentKey];
            if (opp && opp.lp <= 3000) {
                opp.lp = Math.max(0, opp.lp - 500);
                effectUtils.emitDuelLog(duelState.roomId, `👺💥 [Minor Goblin Official] El rival tiene 3000 o menos LP y recibe 500 de daño. (LP: ${opp.lp})`, 'damage');
            }
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
