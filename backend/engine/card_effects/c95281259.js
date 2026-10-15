/**
 * [Passcode: 95281259] The Warrior Returning Alive
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 95281259,
    name: "The Warrior Returning Alive",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarriorInGY = (p?.graveyard || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior');
            if (!hasWarriorInGY) return { canActivate: false, reason: "No hay monstruos Guerrero en tu Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const wIdx = (p.graveyard || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior');
            if (wIdx !== -1) {
                const warrior = p.graveyard.splice(wIdx, 1)[0];
                p.hand = p.hand || [];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️⚔️ [The Warrior Returning Alive] Recupera a "${warrior.name || warrior.card_data?.name}" del Cementerio a la mano.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
