/**
 * [Passcode: 53129443] Dark Hole (Agujero Oscuro)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Destroy all monsters on the field.
 */
module.exports = {
    id: 53129443,
    name: "Dark Hole",
    type: "Normal Spell",
    race: "Spell",
    isMonsterBoardWipe: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const p1Mons = (duelState.player1?.monsters || []).filter(m => m !== null).length;
        const p2Mons = (duelState.player2?.monsters || []).filter(m => m !== null).length;
        if (p1Mons + p2Mons === 0) {
            return { canActivate: false, reason: "No hay monstruos en el campo para destruir." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let destroyedCount = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p && p.monsters) {
                for (let i = 0; i < 5; i++) {
                    const m = p.monsters[i];
                    if (m) {
                        effectUtils.sendCardToGraveyard(duelState, m, pk);
                        p.monsters[i] = null;
                        destroyedCount++;
                    }
                }
            }
        });

        effectUtils.emitDuelLog(
            duelState.roomId, 
            `🕳️💥 [Agujero Oscuro] ¡Agujero Oscuro absorbe y destruye a todos los monstruos (${destroyedCount} destruidos)!`, 
            'spell'
        );
        return { success: true, destroyedCount };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
