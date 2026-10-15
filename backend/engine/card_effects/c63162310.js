/**
 * [Passcode: 63162310] Wall Shadow
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 63162310,
    name: "Wall Shadow",
    type: "Effect Monster",
    atk: 1600,
    def: 3000,
    level: 7,
    race: "Warrior",
    attribute: "DARK",

    canSpecialSummon({ duelState, playerKey }) {
        return { canSummon: true };
    },

    async execute(context) {
        return { success: true };
    }
};
