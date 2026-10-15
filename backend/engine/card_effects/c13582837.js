/**
 * [Passcode: 13582837] Infernity Randomizer
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 13582837,
    name: "Infernity Randomizer",
    type: "Effect Monster",
    atk: 900,
    def: 0,
    level: 1,
    race: "Warrior",
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

        // Efecto de Daño Directo (500 LP)
        opponent.lp = Math.max(0, (opponent.lp || 8000) - 500);
        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡${opponent.username || 'Rival'} recibe 500 puntos de daño directo! (LP restantes: ${opponent.lp})`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);

        // Efecto de Robo (${1} carta(s))
        let drawn = 0;
        for (let i = 0; i < 1; i++) {
            if (pDeck.length > 0) {
                const cardDrawn = pDeck.pop();
                pHand.push(cardDrawn);
                drawn++;
            }
        }
        if (drawn > 0) {
            effectUtils.emitDuelLog(duelState.roomId, `🏺✨ [${this.name}] ¡${player.username || 'Jugador'} roba ${drawn} carta(s) de su Deck!`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
