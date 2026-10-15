/**
 * [Passcode: 74701381] DNA Surgery
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 74701381,
    name: "DNA Surgery",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const declaredRace = targetData?.declared_race || "Dragon";
            duelState.dnaSurgeryRace = declaredRace.toLowerCase();
            effectUtils.emitDuelLog(duelState.roomId, `🧬💉 [DNA Surgery] ¡Cirugía de ADN activa! Todos los monstruos en el campo se transforman al Tipo "${declaredRace}".`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
