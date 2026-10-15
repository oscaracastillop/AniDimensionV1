/**
 * [Passcode: 32807846] Reinforcement of the Army
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 32807846,
    name: "Reinforcement of the Army",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasWarriorInDeck = (p?.deck || []).some(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (!hasWarriorInDeck) return { canActivate: false, reason: "No hay monstruos Guerrero de Nivel 4 o menor en tu Deck." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const wIdx = (p.deck || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (wIdx !== -1) {
                const warrior = p.deck.splice(wIdx, 1)[0];
                p.hand = p.hand || [];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️⚔️ [Reinforcement of the Army] Añade "${warrior.name || warrior.card_data?.name}" (Guerrero Nv.${warrior.level || warrior.card_data?.level}) del Deck a la mano.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
