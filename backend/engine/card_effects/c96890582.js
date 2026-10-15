/**
 * [Passcode: 96890582] Flash Assailant
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 96890582,
    name: "Flash Assailant",
    type: "Effect Monster",
    atk: 2000,
    def: 2000,
    level: 4,
    race: "Warrior",
    attribute: "DARK",

    calculateStats(monster, duelState, playerKey) {
        const handCount = duelState[playerKey]?.hand?.length || 0;
        const penalty = handCount * 400;
        return { atkBonus: -penalty, defBonus: -penalty };
    },

    async execute(context) {
        return { success: true };
    }
};
