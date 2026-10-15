/**
 * [Passcode: 1347977] Mysterious Guard
 * Tipo: Flip Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 1347977,
    name: "Mysterious Guard",
    type: "Flip Effect Monster",
    atk: 800,
    def: 1200,
    level: 3,
    race: "Spellcaster",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'warrior');
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                opp.deck.unshift(targetMon);
                effectUtils.emitDuelLog(duelState.roomId, `🧙‍♂️ [Mysterious Guard] ¡VOLTEO! Devuelve a "${targetMon.name || targetMon.card_data?.name}" al tope del Deck rival.`, 'flip');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
