/**
 * [Passcode: 66788016] Fissure (Fisura)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Destroy the 1 face-up monster your opponent controls that has the lowest ATK (your choice, if tied).
 */
module.exports = {
    id: 66788016,
    name: "Fissure",
    type: "Normal Spell",
    race: "Spell",
    isMonsterRemoval: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppFaceUp = (duelState[oppKey]?.monsters || []).filter(m => m && !m.faceDown).length;
        if (oppFaceUp === 0) {
            return { canActivate: false, reason: "Tu adversario no controla ningún monstruo boca arriba para destruir." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.monsters) return { success: false };

        let lowestSlot = -1;
        let minAtk = Infinity;

        for (let i = 0; i < 5; i++) {
            const m = opp.monsters[i];
            if (m && !m.faceDown) {
                const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                if (atk < minAtk) {
                    minAtk = atk;
                    lowestSlot = i;
                }
            }
        }

        if (lowestSlot !== -1) {
            const target = opp.monsters[lowestSlot];
            const tName = target.card_data?.name || target.name || 'Monstruo';
            effectUtils.sendCardToGraveyard(duelState, target, oppKey);
            opp.monsters[lowestSlot] = null;

            effectUtils.emitDuelLog(
                duelState.roomId,
                `⚡💥 [Fissure] ¡Fisura se abre bajo los pies de "${tName}" (${minAtk} ATK) y lo destruye!`,
                'spell'
            );
            return { success: true };
        }

        return { success: false, reason: "No se encontró ningún monstruo boca arriba en el campo enemigo." };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
