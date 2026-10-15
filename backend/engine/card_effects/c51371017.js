/**
 * [Passcode: 51371017] Princess of Tsurugi
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 51371017,
    name: "Princess of Tsurugi",
    type: "Flip Effect Monster",
    atk: 900,
    def: 700,
    level: 3,
    race: "Warrior",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, opponentKey, effectUtils } = context;
        const oppSTCount = (duelState[opponentKey]?.spells || []).filter(s => s !== null).length + (duelState[opponentKey]?.fieldSpell ? 1 : 0);
        const damage = oppSTCount * 500;
        duelState[opponentKey].lp = Math.max(0, (duelState[opponentKey].lp || 8000) - damage);
        effectUtils.emitDuelLog(duelState.roomId, `👸🗡️ [Princess of Tsurugi] ¡EFECTO DE VOLTEO! Inflige ${damage} de daño directo al rival (${oppSTCount} Magias/Trampas en su campo)!`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        return { success: true, damage };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
