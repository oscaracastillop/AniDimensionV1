/**
 * [Passcode: 90020065] Jigen Bakudan
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 90020065,
    name: "Jigen Bakudan",
    type: "Flip Effect Monster",
    atk: 200,
    def: 1000,
    level: 2,
    race: "Pyro",
    attribute: "FIRE",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, `💣✨ [Volteo: ${this.name}] ¡Bomba Dimensional activada!`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
