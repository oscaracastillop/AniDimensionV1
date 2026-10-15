/**
 * [Passcode: 21015833] Hayabusa Knight
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 21015833,
    name: "Hayabusa Knight",
    type: "Effect Monster",
    atk: 1000,
    def: 700,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",
    canAttackTwice: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🦅⚔️ [Hayabusa Knight] ¡Caballero Hayabusa puede realizar 2 ataques durante cada Battle Phase!`, 'monster');
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
