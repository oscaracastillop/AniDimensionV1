/**
 * [Passcode: 91782219] Crab Turtle
 * Tipo: Ritual Monster | Expansión: MRL
 */
module.exports = {
    id: 91782219,
    name: "Crab Turtle",
    type: "Ritual Monster",
    atk: 2550,
    def: 2500,
    level: 8,
    race: "Aqua",
    attribute: "WATER",
    isRitual: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: false, reason: "Debe ser Invocado por Ritual con \"Turtle Oath\"." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
