/**
 * [Passcode: 77585513] Jinzo
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 77585513,
    name: "Jinzo",
    type: "Effect Monster",
    atk: 2400,
    def: 1500,
    level: 6,
    race: "Machine",
    attribute: "DARK",
    isTrapNegator: true,
    isJinzo: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.trapsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `🤖🚫 [Jinzo] ¡Efecto continuo activo! Las cartas de Trampa no pueden activarse y todos los efectos de Trampas en el campo quedan anulados.`, 'monster');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
