/**
 * [Passcode: 4849037] Performance of Sword
 * Tipo: Ritual Monster | Expansión: MRL
 */
module.exports = {
    id: 4849037,
    name: "Performance of Sword",
    type: "Ritual Monster",
    atk: 1950,
    def: 1850,
    level: 6,
    race: "Warrior",
    attribute: "EARTH",
    isRitual: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: false, reason: "Debe ser Invocado por Ritual con \"Commencement Dance\"." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
