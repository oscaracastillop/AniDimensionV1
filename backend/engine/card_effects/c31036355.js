/**
 * [Passcode: 31036355] Creature Swap
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 31036355,
    name: "Creature Swap",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasMyMon = (p?.monsters || []).some(m => m);
            const hasOppMon = (opp?.monsters || []).some(m => m);
            if (!hasMyMon || !hasOppMon) return { canActivate: false, reason: "Ambos jugadores deben controlar al menos 1 monstruo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const pSlot = (p.monsters || []).findIndex(m => m);
            const oppSlot = (opp.monsters || []).findIndex(m => m);

            if (pSlot !== -1 && oppSlot !== -1) {
                const pMon = p.monsters[pSlot];
                const oppMon = opp.monsters[oppSlot];

                p.monsters[pSlot] = oppMon;
                opp.monsters[oppSlot] = pMon;

                effectUtils.emitDuelLog(duelState.roomId, `🔄🔄 [Creature Swap] ¡Intercambio de criaturas! ${p.username} cede a "${pMon.name || pMon.card_data?.name}" y toma control de "${oppMon.name || oppMon.card_data?.name}". Ninguno puede cambiar su posición este turno.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
