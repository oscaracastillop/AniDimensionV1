/**
 * [Passcode: 19230407] Offerings to the Doomed
 * Tipo: Quick-Play Spell | Expansión: LON
 */
module.exports = {
    id: 19230407,
    name: "Offerings to the Doomed",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasFaceUpMon = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m && !m.faceDown);
            if (tSlot !== -1 && opp.monsters?.[tSlot]) {
                const destroyed = opp.monsters[tSlot];
                opp.monsters[tSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                duelState.skipNextDrawPhase = duelState.skipNextDrawPhase || {};
                duelState.skipNextDrawPhase[playerKey] = true;
                effectUtils.emitDuelLog(duelState.roomId, `⚰️💥 [Offerings to the Doomed] ¡Destruye a "${destroyed.card_data?.name || 'Monstruo'}"! Te saltarás tu próxima Draw Phase.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
