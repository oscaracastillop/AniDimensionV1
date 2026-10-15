/**
 * [Passcode: 41925941] Bark of Dark Ruler
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 41925941,
    name: "Bark of Dark Ruler",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasFiend = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (!hasFiend) return { canActivate: false, reason: "Requiere un monstruo Demonio en batalla." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetOppMon = (opp.monsters || []).find(m => m);
            if (targetOppMon) {
                targetOppMon.currentAtk = Math.max(0, (targetOppMon.currentAtk !== undefined ? targetOppMon.currentAtk : (targetOppMon.card_data?.atk || 0)) - 1000);
                effectUtils.emitDuelLog(duelState.roomId, `🗣️💥 [Bark of Dark Ruler] Paga LP para reducir el ATK del monstruo rival en 1000 (ATK restante: ${targetOppMon.currentAtk}).`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
