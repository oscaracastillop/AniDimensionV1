/**
 * [Passcode: 80163754] Burst Breath
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 80163754,
    name: "Burst Breath",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasDragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (!hasDragon) return { canActivate: false, reason: "Debes tributar 1 monstruo Dragón." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const dIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            let tAtk = 0;
            if (dIdx !== -1) {
                const dragon = p.monsters[dIdx];
                tAtk = dragon.currentAtk !== undefined ? dragon.currentAtk : (dragon.card_data?.atk || 0);
                effectUtils.sendCardToGraveyard(duelState, dragon, playerKey);
                p.monsters[dIdx] = null;
            }

            let destroyed = 0;
            (opp.monsters || []).forEach((m, idx) => {
                if (m) {
                    const def = m.currentDef !== undefined ? m.currentDef : (m.card_data?.def || 0);
                    if (def <= tAtk) {
                        effectUtils.sendCardToGraveyard(duelState, m, oppKey);
                        opp.monsters[idx] = null;
                        destroyed++;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Burst Breath] Tributa un Dragón (${tAtk} ATK) y destruye ${destroyed} monstruos rivales con DEF <= ${tAtk}.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
