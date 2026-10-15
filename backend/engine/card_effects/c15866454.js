/**
 * [Passcode: 15866454] Spiritualism
 * Tipo: Normal Spell | Expansión: LON
 */
module.exports = {
    id: 15866454,
    name: "Spiritualism",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasST = (duelState[oppKey]?.spells || []).some(s => s) || Boolean(duelState[oppKey]?.fieldSpell);
            if (!hasST) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const [returned] = opp.spells.splice(sIdx, 1, null);
                opp.hand.push(returned);
                effectUtils.emitDuelLog(duelState.roomId, `💨📜 [Spiritualism] ¡Regresa "${returned.card_data?.name || 'M/T'}" del campo rival a su mano! Esta activación no puede ser negada.`, 'spell');
            } else if (opp.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                opp.hand.push(fs);
                effectUtils.emitDuelLog(duelState.roomId, `💨📜 [Spiritualism] Regresa el Campo Mágico rival a la mano.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
