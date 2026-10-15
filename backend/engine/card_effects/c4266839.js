/**
 * [Passcode: 4266839] Kiseitai
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 4266839,
    name: "Kiseitai",
    type: "Effect Monster",
    atk: 300,
    def: 800,
    level: 2,
    race: "Fiend",
    attribute: "WIND",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🪱🦠 [Kiseitai] Al ser atacado boca abajo se equipa al atacante. En cada Standby Phase del rival ganas LP iguales a la mitad de su ATK.`, 'monster');
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
