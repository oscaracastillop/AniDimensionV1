/**
 * [Passcode: 41426869] Black Illusion Ritual
 * Tipo: Ritual Spell | Expansión: MRL
 */
module.exports = {
    id: 41426869,
    name: "Black Illusion Ritual",
    type: "Ritual Spell",
    race: "Ritual",
    isRitualSpell: true,
    ritualInfo: {
        monster_id: 64631466,
        required_level: 1,
        monster_name: "Relinquished"
    },

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        const hasRelin = p && p.hand && p.hand.some(c => Number(c?.card_id || c?.id || c || 0) === 64631466);
        if (!hasRelin) return { canActivate: false, reason: "Se requiere a \"Relinquished\" en la mano." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `👁️🕯️ [${this.name}] ¡Ritual de la Ilusión Negra ejecutado para invocar a Relinquished!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
