/**
 * [Passcode: 12253117] World Suppression
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 12253117,
    name: "World Suppression",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            if (!duelState[oppKey]?.fieldSpell) return { canActivate: false, reason: "El rival no tiene Campo Mágico activo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            if (opp?.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                effectUtils.sendCardToGraveyard(duelState, fs, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌍🚫 [World Suppression] ¡Destruye la Carta de Campo "${fs.card_data?.name || 'Campo'}" del rival!`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
