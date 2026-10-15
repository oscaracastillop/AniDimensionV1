/**
 * [Passcode: 12470447] Curse of Fiend
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 12470447,
    name: "Curse of Fiend",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let changed = 0;
        ['player1', 'player2'].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m && !m.faceDown) {
                    m.position = m.position === 'ATK' ? 'DEF' : 'ATK';
                    changed++;
                }
            });
        });
        effectUtils.emitDuelLog(duelState.roomId, `👹✨ [${this.name}] ¡Cambia la posición de batalla de ${changed} monstruos boca arriba en el campo!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
