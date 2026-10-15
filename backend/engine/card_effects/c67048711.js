/**
 * [Passcode: 67048711] 7
 * Tipo: Continuous Spell
 * Arquetipo: General
 */
module.exports = {
    id: 67048711,
    name: "7",
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

        // Efecto de Curación de LP (+700 LP)
        player.lp = (player.lp || 8000) + 700;
        effectUtils.emitDuelLog(duelState.roomId, `💖✨ [${this.name}] ¡${player.username || 'Jugador'} recupera 700 LP! (Total LP: ${player.lp})`, 'heal');

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
