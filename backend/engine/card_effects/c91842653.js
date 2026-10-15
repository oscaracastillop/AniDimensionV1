/**
 * [Passcode: 91842653] Toon Summoned Skull
 * Tipo: Effect Monster (Toon) | Expansión: MRL
 */
module.exports = {
    id: 91842653,
    name: "Toon Summoned Skull",
    type: "Effect Monster",
    atk: 2500,
    def: 1200,
    level: 6,
    race: "Fiend",
    attribute: "DARK",
    isToon: true,
    requiresToonWorld: true,
    canAttackDirectly: true,
    attackCostLp: 500,

    canSpecialSummon({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hasToonWorld) {
            return { canSummon: false, reason: "Se requiere \"Toon World\" en tu campo para Invocar a \"Toon Summoned Skull\"." };
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
