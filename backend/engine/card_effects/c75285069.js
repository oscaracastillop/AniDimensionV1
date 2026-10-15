/**
 * [Passcode: 75285069] Moisture Creature
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 75285069,
    name: "Moisture Creature",
    type: "Effect Monster",
    atk: 2800,
    def: 2900,
    level: 9,
    race: "Fairy",
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

        // Efecto: Destruir Magias y Trampas en el campo
        let stCount = 0;
        for (let i = 0; i < oppSpells.length; i++) {
            if (oppSpells[i]) { effectUtils.sendCardToGraveyard(duelState, opponentKey, oppSpells[i]); oppSpells[i] = null; stCount++; }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌪️⚡ [${this.name}] ¡Destruyó todas las Magias y Trampas (${stCount}) del rival!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
