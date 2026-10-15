/**
 * [Passcode: 20228463] Ceremonial Bell
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 20228463,
    name: "Ceremonial Bell",
    type: "Effect Monster",
    atk: 0,
    def: 1850,
    level: 3,
    race: "Spellcaster",
    attribute: "LIGHT",

    async execute(context) {
        return { success: true };
    }
};
