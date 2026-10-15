/**
 * [Passcode: 473469] Driving Snow
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 473469,
    name: "Driving Snow",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSpellTrapRemoval: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasTarget = (duelState[oppKey]?.spells || []).some(s => s);
            if (!hasTarget) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const destroyed = opp.spells[sIdx];
                opp.spells[sIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `❄️💥 [Driving Snow] Ventisca destruye "${destroyed.card_data?.name || 'M/T'}" del rival.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
