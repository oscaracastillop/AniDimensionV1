/**
 * [Passcode: 76806714] Turtle Oath
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: 76806714,
    name: "Turtle Oath",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: 91782219,
        required_level: 8,
        monster_name: "Crab Turtle"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasMonster = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === 91782219);
        if (!hasMonster) return { canActivate: false, reason: "Se requiere a \"Crab Turtle\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🕯️✨ [${this.name}] ¡Ritual activado para invocar a Crab Turtle!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
