/**
 * [Passcode: 3682106] Double Snare
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 3682106,
    name: "Double Snare",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const hasTarget = (opp?.spells || []).some(s => s) || (opp?.monsters || []).some(m => m && (m.isJinzo || m.isTrapNegator));
            if (!hasTarget) return { canActivate: false, reason: "No hay cartas negadoras de trampas en el campo rival." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const jinzoIdx = (opp.monsters || []).findIndex(m => m && (m.isJinzo || m.isTrapNegator || Number(m.card_id || m.card_data?.id) === 77585513));
            if (jinzoIdx !== -1) {
                const jinzo = opp.monsters[jinzoIdx];
                effectUtils.sendCardToGraveyard(duelState, jinzo, oppKey);
                opp.monsters[jinzoIdx] = null;
                effectUtils.emitDuelLog(duelState.roomId, `🪤💥 [Double Snare] Destruye a "${jinzo.name || jinzo.card_data?.name}" en el campo rival.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
