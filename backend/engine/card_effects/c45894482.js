/**
 * [Passcode: 45894482] Gilasaurus
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 45894482,
    name: "Gilasaurus",
    type: "Effect Monster",
    atk: 1400,
    def: 400,
    level: 3,
    race: "Dinosaur",
    attribute: "EARTH",
    canSpecialSummonSelf: true,

    canActivate() { return { canActivate: true }; },

    async onSpecialSummon(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];

            // El oponente puede invocar de modo especial 1 monstruo de su cementerio
            const oppGyMonIdx = (opp.graveyard || []).findIndex(c => (c.type || '').toLowerCase().includes('monster'));
            if (oppGyMonIdx !== -1) {
                const emptySlot = (opp.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    const oppMon = opp.graveyard.splice(oppGyMonIdx, 1)[0];
                    oppMon.position = 'face-up-defense';
                    oppMon.currentAtk = oppMon.atk || oppMon.card_data?.atk || 0;
                    oppMon.currentDef = oppMon.def || oppMon.card_data?.def || 0;
                    opp.monsters[emptySlot] = oppMon;
                    effectUtils.emitDuelLog(duelState.roomId, `🦖 [Gilasaurus] Invocado de Modo Especial. ${opp.username} invoca a "${oppMon.name || oppMon.card_data?.name}" desde su Cementerio.`, 'monster');
                }
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `🦖 [Gilasaurus] Invocado de Modo Especial desde la mano.`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
