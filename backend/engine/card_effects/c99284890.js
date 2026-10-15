/**
 * [Passcode: 99284890] Avatar of The Pot
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 99284890,
    name: "Avatar of The Pot",
    type: "Effect Monster",
    atk: 1200,
    def: 1300,
    level: 3,
    race: "Rock",
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

        // Efecto de Robo (${3} carta(s))
        let drawn = 0;
        for (let i = 0; i < 3; i++) {
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
