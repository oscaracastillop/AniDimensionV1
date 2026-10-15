/**
 * [Passcode: 58551308] Spear Cretin
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 58551308,
    name: "Spear Cretin",
    type: "Flip Effect Monster",
    atk: 500,
    def: 500,
    level: 2,
    race: "Fiend",
    attribute: "DARK",
    isFlip: true,

    async onFlip(context) {
        const { duelState, effectUtils } = context;
        effectUtils.emitDuelLog(duelState.roomId, `🔱✨ [Volteo: ${this.name}] ¡Idiota de la Lanza activado! Al ser enviado al Cementerio, ambos duelistas revivirán 1 monstruo.`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
