/**
 * [Passcode: 33550694] Fusion Gate
 * Tipo: Field Spell | Expansión: LON
 */
module.exports = {
    id: 33550694,
    name: "Fusion Gate",
    type: "Field Spell",
    race: "Spell",
    isField: true,
    isFusionGate: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fusionGateActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌌🌀 [Fusion Gate] ¡Puerta de Fusión desplegada! Ambos jugadores pueden Invocar por Fusión desterrando los materiales de la mano o el campo sin Polimerización.`, 'field');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
