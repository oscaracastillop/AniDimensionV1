/**
 * [Passcode: 80811661] Hamburger Recipe
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: 80811661,
    name: "Hamburger Recipe",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: 30243636,
        required_level: 6,
        monster_name: "Hungry Burger"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasMonster = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === 30243636);
        if (!hasMonster) return { canActivate: false, reason: "Se requiere a \"Hungry Burger\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🕯️✨ [${this.name}] ¡Ritual activado para invocar a Hungry Burger!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
