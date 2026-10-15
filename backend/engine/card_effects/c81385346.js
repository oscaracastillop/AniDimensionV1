/**
 * [Passcode: 81385346] Stamping Destruction
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 81385346,
    name: "Stamping Destruction",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            const hasTarget = (p?.spells || []).some(s => s) || (opp?.spells || []).some(s => s);
            if (!hasDragon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo Dragón boca arriba." };
            if (!hasTarget) return { canActivate: false, reason: "No hay cartas Mágicas o Trampas en el campo para destruir." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const targetCard = opp.spells[sIdx];
                effectUtils.sendCardToGraveyard(duelState, targetCard, oppKey);
                opp.spells[sIdx] = null;
                opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `💥🐉 [Stamping Destruction] Destruye "${targetCard.name || targetCard.card_data?.name}" e inflige 500 de daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
