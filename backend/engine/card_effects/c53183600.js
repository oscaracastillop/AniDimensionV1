/**
 * [Passcode: 53183600] Blue-Eyes Toon Dragon
 * Tipo: Effect Monster (Toon) | Expansión: MRL
 */
module.exports = {
    id: 53183600,
    name: "Blue-Eyes Toon Dragon",
    type: "Effect Monster",
    atk: 3000,
    def: 2500,
    level: 8,
    race: "Dragon",
    attribute: "LIGHT",
    isToon: true,
    requiresToonWorld: true,
    canAttackDirectly: true,
    attackCostLp: 500,

    canSpecialSummon({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hasToonWorld) {
            return { canSummon: false, reason: "Se requiere \"Toon World\" en tu campo para Invocar a \"Blue-Eyes Toon Dragon\"." };
        }
        return { canSummon: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🎭✨ [${this.name}] ¡Monstruo Toon en el campo! Puede atacar directamente si el rival no controla monstruos Toon.`, 'toon');
        return { success: true };
    },

    async execute(context) {
        return { success: true };
    }
};
