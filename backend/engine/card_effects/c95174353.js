/**
 * [Passcode: 95174353] Ameba
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 95174353,
    name: "Ameba",
    type: "Effect Monster",
    atk: 300,
    def: 350,
    level: 1,
    race: "Aqua",
    attribute: "WATER",

    async onControlShift(context) {
        const { duelState, newControllerKey, effectUtils } = context;
        const newController = duelState[newControllerKey];
        if (newController) {
            newController.lp = Math.max(0, (newController.lp || 8000) - 2000);
            effectUtils.emitDuelLog(duelState.roomId, `🦠💥 [${this.name}] ¡Cambio de control! ${newController.username} recibe 2000 puntos de daño directo (LP: ${newController.lp}).`, 'damage');
        }
    },

    async execute(context) {
        return { success: true };
    }
};
