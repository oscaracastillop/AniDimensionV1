/**
 * [Passcode: 71283180] Tornado Bird
 * Tipo: Flip Effect Monster | Expansión: LON
 */
module.exports = {
    id: 71283180,
    name: "Tornado Bird",
    type: "Flip Effect Monster",
    atk: 1100,
    def: 1000,
    level: 4,
    race: "Winged Beast",
    attribute: "WIND",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            let bounced = 0;
            // Retorna hasta 2 cartas Mágicas o de Trampa del campo a la mano
            const targets = [];
            (opp.spellTrapZone || []).forEach((st, idx) => {
                if (st && targets.length < 2) targets.push({ zone: 'opp', idx, card: st });
            });
            (p.spellTrapZone || []).forEach((st, idx) => {
                if (st && targets.length < 2) targets.push({ zone: 'p', idx, card: st });
            });

            targets.forEach(t => {
                if (t.zone === 'opp') {
                    opp.spellTrapZone[t.idx] = null;
                    opp.hand.push(t.card);
                } else {
                    p.spellTrapZone[t.idx] = null;
                    p.hand.push(t.card);
                }
                bounced++;
            });

            effectUtils.emitDuelLog(duelState.roomId, `🌪️ [Tornado Bird] ¡VOLTEO! Devuelve ${bounced} cartas Mágicas/Trampas del campo a la mano de sus dueños.`, 'flip');
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
