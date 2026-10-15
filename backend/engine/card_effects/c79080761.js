/**
 * [Passcode: 79080761] Gigastone Omega
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 79080761,
    name: "Gigastone Omega",
    type: "Effect Monster",
    atk: 1000,
    def: 2300,
    level: 5,
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
