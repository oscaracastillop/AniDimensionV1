/**
 * [Passcode: 40473581] Susa Soldier
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 40473581,
    name: "Susa Soldier",
    type: "Spirit Effect Monster",
    atk: 2000,
    def: 1600,
    level: 4,
    race: "Thunder",
    attribute: "EARTH",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
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
