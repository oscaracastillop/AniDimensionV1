/**
 * [Passcode: 24128274] Deepsea Warrior
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 24128274,
    name: "Deepsea Warrior",
    type: "Effect Monster",
    atk: 1600,
    def: 1800,
    level: 5,
    race: "Warrior",
    attribute: "WATER",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (hasUmi) {
                effectUtils.emitDuelLog(duelState.roomId, `🌊🛡️ [Deepsea Warrior] Con Umi en el campo, es completamente inmune a los efectos de Cartas Mágicas.`, 'monster');
            }
            return { success: true, immune: hasUmi };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
