/**
 * [Passcode: 38369349] Manga Ryu-Ran
 * Tipo: Effect Monster (Toon) | Expansión: MRL
 */
module.exports = {
    id: 38369349,
    name: "Manga Ryu-Ran",
    type: "Effect Monster",
    atk: 2200,
    def: 2600,
    level: 7,
    race: "Dragon",
    attribute: "FIRE",
    isToon: true,
    requiresToonWorld: true,
    canAttackDirectly: true,
    attackCostLp: 500,

    canSpecialSummon({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hasToonWorld) {
            return { canSummon: false, reason: "Se requiere \"Toon World\" en tu campo para Invocar a \"Manga Ryu-Ran\"." };
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
