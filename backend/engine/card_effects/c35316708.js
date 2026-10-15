/**
 * [Passcode: 35316708] Time Seal
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 35316708,
    name: "Time Seal",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.timeSealActiveOnPlayer = opponentKey;
            effectUtils.emitDuelLog(duelState.roomId, `⏳🔒 [Time Seal] ¡Sello Temporal activo! El oponente se salta la Draw Phase de su próximo turno.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
