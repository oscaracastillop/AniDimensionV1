/**
 * [Passcode: 36468556] Ceasefire
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 36468556,
    name: "Ceasefire",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m);
            if (allMonsters.length === 0) return { canActivate: false, reason: "No hay monstruos en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let revealedCount = 0;
            let effectMonsterCount = 0;

            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach(m => {
                    if (m) {
                        if (m.faceDown) {
                            m.faceDown = false;
                            revealedCount++;
                            // En Ceasefire, los efectos de volteo NO se activan
                        }
                        const ct = (m.card_data?.type || m.type || '').toLowerCase();
                        if (ct.includes('effect')) effectMonsterCount++;
                    }
                });
            });

            const burnDmg = effectMonsterCount * 500;
            duelState[oppKey].lp = Math.max(0, (duelState[oppKey].lp || 8000) - burnDmg);
            effectUtils.emitDuelLog(duelState.roomId, `🕊️💥 [Ceasefire] ¡Alto al Fuego! Voltea ${revealedCount} monstruos boca arriba (sin efectos de volteo) e inflige ${burnDmg} de daño (${effectMonsterCount} monstruos de efecto x 500 LP) a ${duelState[oppKey].username}. (LP: ${duelState[oppKey].lp})`, 'damage');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
