/**
 * [Passcode: 79707116] Paralyzing Chain
 * Tipo: Continuous Spell
 * Arquetipo: General
 */
module.exports = {
    id: 79707116,
    name: "Paralyzing Chain",
    type: "Continuous Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "Continuous",
    isEquip: false,
    isField: false,
    isContinuous: true,
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

        // Efecto de Daño Directo (300 LP)
        opponent.lp = Math.max(0, (opponent.lp || 8000) - 300);
        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡${opponent.username || 'Rival'} recibe 300 puntos de daño directo! (LP restantes: ${opponent.lp})`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
