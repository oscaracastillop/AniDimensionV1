/**
 * [Passcode: 78658564] Goblin Attack Force
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 78658564,
    name: "Goblin Attack Force",
    type: "Effect Monster",
    atk: 2300,
    def: 0,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👺⚔️ [Goblin Attack Force] ¡Fuerza de Ataque Goblin en combate! Cambiará a Posición de Defensa tras atacar y no podrá cambiar su posición hasta el final del próximo turno.`, 'monster');
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
