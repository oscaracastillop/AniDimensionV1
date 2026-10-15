/**
 * [Passcode: 25833572] Gate Guardian
 * Tipo: Effect Monster
 */
module.exports = {
    id: 25833572,
    name: "Gate Guardian",
    type: "Effect Monster",
    atk: 3750,
    def: 3400,
    level: 11,
    race: "Warrior",
    
    canSpecialSummon(context) {
        const { duelState, playerKey } = context;
        const field = duelState[playerKey]?.monsters || [];
        const hasSanga = field.some(m => m && Number(m.card_id || m.card_data?.id) === 25955164);
        const hasKaze = field.some(m => m && Number(m.card_id || m.card_data?.id) === 62340868);
        const hasSui = field.some(m => m && Number(m.card_id || m.card_data?.id) === 98434877);
        return { canSummon: hasSanga && hasKaze && hasSui, reason: "Requiere Sanga, Kazejin y Suijin en el campo." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        effectUtils.emitDuelLog(duelState.roomId, `🚪⚡ [Gate Guardian] ¡El Guardián de la Puerta hace su aparición triunfal en el campo!`, 'summon');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
