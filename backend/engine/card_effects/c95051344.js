/**
 * [Passcode: 95051344] Eternal Rest
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 95051344,
    name: "Eternal Rest",
    type: "Normal Spell",
    race: "Spell",
    isMonsterRemoval: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let destroyed = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    const m = p.monsters[i];
                    if (m && m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'EQUIP')) {
                        effectUtils.sendCardToGraveyard(duelState, m, pk);
                        p.monsters[i] = null;
                        destroyed++;
                    }
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `🪦✨ [${this.name}] ¡Descanso Eterno destruye ${destroyed} monstruo(s) equipado(s) en el campo!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
