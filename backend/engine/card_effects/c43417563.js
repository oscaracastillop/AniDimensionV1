/**
 * [Passcode: 43417563] Commencement Dance
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: 43417563,
    name: "Commencement Dance",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: 4849037,
        required_level: 6,
        monster_name: "Performance of Sword"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasMonster = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === 4849037);
        if (!hasMonster) return { canActivate: false, reason: "Se requiere a \"Performance of Sword\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🕯️✨ [${this.name}] ¡Ritual activado para invocar a Performance of Sword!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
