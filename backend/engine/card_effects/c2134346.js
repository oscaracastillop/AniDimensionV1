/**
 * [Passcode: 2134346] Asura Priest
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 2134346,
    name: "Asura Priest",
    type: "Spirit Effect Monster",
    atk: 1700,
    def: 1200,
    level: 4,
    race: "Fairy",
    attribute: "LIGHT",
    isSpirit: true,
    cannotSpecialSummon: true,
    canAttackAllMonsters: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de ataque múltiple." }; },

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
