/**
 * [Passcode: 77084837] Inaba White Rabbit
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 77084837,
    name: "Inaba White Rabbit",
    type: "Spirit Effect Monster",
    atk: 700,
    def: 500,
    level: 3,
    race: "Beast",
    attribute: "EARTH",
    isSpirit: true,
    cannotSpecialSummon: true,
    canAttackDirectly: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de ataque directo." }; },

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
