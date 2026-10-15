/**
 * [Passcode: 30243636] Hungry Burger
 * Tipo: Ritual Monster | Expansión: MRL
 */
module.exports = {
    id: 30243636,
    name: "Hungry Burger",
    type: "Ritual Monster",
    atk: 2000,
    def: 1850,
    level: 6,
    race: "Warrior",
    attribute: "DARK",
    isRitual: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: false, reason: "Debe ser Invocado por Ritual con \"Hamburger Recipe\"." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
