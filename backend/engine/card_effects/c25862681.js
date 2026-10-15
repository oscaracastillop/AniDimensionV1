/**
 * [Passcode: 25862681] Ancient Fairy Dragon
 * Tipo: Synchro Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 25862681,
    name: "Ancient Fairy Dragon",
    type: "Synchro Effect Monster",
    atk: 2100,
    def: 3000,
    level: 7,
    race: "Dragon",
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

        // Efecto de Curación de LP (+1000 LP)
        player.lp = (player.lp || 8000) + 1000;
        effectUtils.emitDuelLog(duelState.roomId, `💖✨ [${this.name}] ¡${player.username || 'Jugador'} recupera 1000 LP! (Total LP: ${player.lp})`, 'heal');

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
