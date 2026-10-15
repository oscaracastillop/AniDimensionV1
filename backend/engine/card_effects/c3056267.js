/**
 * [Passcode: 3056267] Invader of the Throne
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 3056267,
    name: "Invader of the Throne",
    type: "Flip Effect Monster",
    atk: 1350,
    def: 1700,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, `👑✨ [Volteo: ${this.name}] ¡Invasor del Trono intercambia el control de este monstruo con 1 monstruo del oponente!`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
