/**
 * [Passcode: 6337436] Rapid-Fire Magician
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 6337436,
    name: "Rapid-Fire Magician",
    type: "Effect Monster",
    atk: 1600,
    def: 1200,
    level: 4,
    race: "Spellcaster",
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

        // Efecto de Daño Directo (400 LP)
        opponent.lp = Math.max(0, (opponent.lp || 8000) - 400);
        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡${opponent.username || 'Rival'} recibe 400 puntos de daño directo! (LP restantes: ${opponent.lp})`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
