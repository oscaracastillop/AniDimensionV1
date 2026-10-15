/**
 * [Passcode: 51345461] Sword Hunter
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 51345461,
    name: "Sword Hunter",
    type: "Effect Monster",
    atk: 2450,
    def: 1700,
    level: 7,
    race: "Warrior",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🗡️🛡️ [Sword Hunter] Al final de la Battle Phase equipa a los monstruos que destruyó en combate, ganando +200 ATK por cada uno.`, 'monster');
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
