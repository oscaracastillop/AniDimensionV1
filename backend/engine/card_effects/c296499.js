/**
 * [Passcode: 296499] The Regulation of Tribe
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 296499,
    name: "The Regulation of Tribe",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredRace = targetData?.declared_race || "Warrior";
            duelState.regulationOfTribeRace = declaredRace.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `📜🛡️ [The Regulation of Tribe] Monstruos del Tipo "${declaredRace}" no pueden declarar ataques.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
