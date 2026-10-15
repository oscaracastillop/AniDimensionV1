/**
 * [Passcode: 65458948] Toon Mermaid
 * Tipo: Effect Monster (Toon) | Expansión: MRL
 */
module.exports = {
    id: 65458948,
    name: "Toon Mermaid",
    type: "Effect Monster",
    atk: 1400,
    def: 1500,
    level: 4,
    race: "Aqua",
    attribute: "WATER",
    isToon: true,
    requiresToonWorld: true,
    canAttackDirectly: true,
    attackCostLp: 500,

    canSpecialSummon({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.hasToonWorld) {
            return { canSummon: false, reason: "Se requiere \"Toon World\" en tu campo para Invocar a \"Toon Mermaid\"." };
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
