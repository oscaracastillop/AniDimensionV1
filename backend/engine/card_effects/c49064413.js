/**
 * [Passcode: 49064413] The Masked Beast
 * Tipo: Ritual Monster | Expansión: LON
 */
module.exports = {
    id: 49064413,
    name: "The Masked Beast",
    type: "Ritual Monster",
    atk: 3200,
    def: 1800,
    level: 8,
    race: "Fiend",
    attribute: "DARK",
    isRitual: true,
    ritualInfo: {"ritualSpellId":94377247,"requiredTributesLevel":8},

    canActivate() { return { canActivate: false, reason: "Monstruo de Ritual, se invoca mediante Curse of the Masked Beast." }; },

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
