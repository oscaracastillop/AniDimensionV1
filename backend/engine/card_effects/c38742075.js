/**
 * [Passcode: 38742075] Frontier Wiseman
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 38742075,
    name: "Frontier Wiseman",
    type: "Effect Monster",
    atk: 1600,
    def: 800,
    level: 3,
    race: "Spellcaster",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️ [Frontier Wiseman] Envía 1 monstruo al Cementerio para negar una Magia que designe a un Guerrero.`, 'monster');
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
