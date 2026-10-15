/**
 * [Passcode: 58621589] Shadow of Eyes
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 58621589,
    name: "Shadow of Eyes",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const setMonIdx = (opp?.monsters || []).findLastIndex(m => m && m.faceDown);
            if (setMonIdx !== -1) {
                const mon = opp.monsters[setMonIdx];
                mon.faceDown = false;
                mon.position = 'ATK';
                effectUtils.emitDuelLog(duelState.roomId, `👁️⭐ [Shadow of Eyes] Fuerza a "${mon.card_data?.name || 'Monstruo'}" a Posición de Ataque boca arriba.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
