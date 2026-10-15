/**
 * [Passcode: 60866277] Earthshaker
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 60866277,
    name: "Earthshaker",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasMonster = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            // Destruye monstruos boca arriba de los atributos seleccionados
            let count = 0;
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, opponentKey);
                    count++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌍💥 [Earthshaker] ¡Terremoto masivo destruye ${count} monstruo(s) boca arriba del rival!`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
