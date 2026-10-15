/**
 * [Passcode: 56387350] Vampire Baby
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 56387350,
    name: "Vampire Baby",
    type: "Effect Monster",
    atk: 700,
    def: 1000,
    level: 3,
    race: "Zombie",
    attribute: "DARK",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦇🩸 [Vampire Baby] Al final de la Battle Phase invoca de modo especial al monstruo que destruyó en combate.`, 'monster');
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
