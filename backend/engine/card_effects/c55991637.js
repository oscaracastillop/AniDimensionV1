/**
 * [Passcode: 55991637] Dragon's Gunfire
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 55991637,
    name: "Dragon's Gunfire",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragon) return { canActivate: false, reason: "Requiere al menos 1 monstruo Dragón boca arriba en tu campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            // Opción estándar: 800 de daño al rival
            opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🐉 [Dragon's Gunfire] ¡Fuego de Dragón! Inflige 800 de daño directo a ${opp.username} (LP: ${opp.lifePoints}).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
