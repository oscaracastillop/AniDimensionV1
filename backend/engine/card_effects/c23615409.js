/**
 * [Passcode: 23615409] Insect Barrier
 * Tipo: Continuous Spell | Expansión: PSV
 */
module.exports = {
    id: 23615409,
    name: "Insect Barrier",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.insectBarrierActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🦗 [Insect Barrier] ¡Barrera Antinsectos desplegada! Ningún monstruo de Tipo Insecto del oponente puede declarar ataques.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
