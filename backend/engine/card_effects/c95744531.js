/**
 * [Passcode: 95744531] Griggle
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95744531,
    name: "Griggle",
    type: "Effect Monster",
    atk: 350,
    def: 300,
    level: 1,
    race: "Plant",
    attribute: "EARTH",

    async onControlShift(context) {
        const { duelState, originalOwnerKey, effectUtils } = context;
        const owner = duelState[originalOwnerKey];
        if (owner) {
            owner.lp = (owner.lp || 8000) + 3000;
            effectUtils.emitDuelLog(duelState.roomId, `🌱💚 [${this.name}] ¡Cambio de control! ${owner.username} recupera 3000 LP (LP: ${owner.lp}).`, 'heal');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
