/**
 * [Passcode: 31383545] XX-Saber Darksoul
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 31383545,
    name: "XX-Saber Darksoul",
    type: "Effect Monster",
    atk: 100,
    def: 100,
    level: 3,
    race: "Beast",
    isEquip: false,
    isField: false,
    isContinuous: false,
    isQuickPlay: false,
    isCounter: false,
    canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const playerField = player.field || player;
        const oppField = opponent.field || opponent;
        const pMonsters = playerField.monsters || player.monsters || [];
        const oppMonsters = oppField.monsters || opponent.monsters || [];
        const pSpells = playerField.spells || player.spells || [];
        const oppSpells = oppField.spells || opponent.spells || [];
        const pHand = player.hand || [];
        const oppHand = opponent.hand || [];
        const pDeck = player.deck || [];
        const oppDeck = opponent.deck || [];
        const pGY = playerField.graveyard || player.graveyard || [];
        const oppGY = oppField.graveyard || opponent.graveyard || [];

        // Búsqueda en el Deck a la Mano
        const searchIdx = pDeck.findIndex(c => {
            const cType = (c.type || '').toLowerCase();
            const cName = (c.name || '').toLowerCase();
            return cType.includes('monster') || cType.includes('spell');
        });
        if (searchIdx !== -1) {
            const [found] = pDeck.splice(searchIdx, 1);
            pHand.push(found);
            effectUtils.emitDuelLog(duelState.roomId, `🔍✨ [${this.name}] ¡Añade "${found.name || 'Carta'}" del Deck a la mano!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
