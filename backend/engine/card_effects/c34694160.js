/**
 * [Passcode: 34694160] The Eye of Truth
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 34694160,
    name: "The Eye of Truth",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.eyeOfTruthActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [The Eye of Truth] ¡El Ojo de la Verdad se abre! El oponente debe mostrar su mano en todo momento. Si tiene una Magia en su Standby Phase, gana 1000 LP.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
