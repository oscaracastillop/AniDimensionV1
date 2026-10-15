/**
 * [Passcode: 12580477] Raigeki (Raigeki)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Destroy all monsters your opponent controls.
 */
module.exports = {
    id: 12580477,
    name: "Raigeki",
    type: "Normal Spell",
    race: "Spell",
    isMonsterBoardWipe: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppMons = (duelState[oppKey]?.monsters || []).filter(m => m !== null).length;
        if (oppMons === 0) {
            return { canActivate: false, reason: "Tu adversario no controla ningún monstruo para destruir." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        let destroyedCount = 0;

        if (opp && opp.monsters) {
            for (let i = 0; i < 5; i++) {
                const m = opp.monsters[i];
                if (m) {
                    effectUtils.sendCardToGraveyard(duelState, m, oppKey);
                    opp.monsters[i] = null;
                    destroyedCount++;
                }
            }
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            `⚡💥 [Raigeki] ¡Un rayo fulminante destruye todos los monstruos de ${opp?.username || 'tu adversario'} (${destroyedCount} destruidos)!`,
            'spell'
        );
        return { success: true, destroyedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
