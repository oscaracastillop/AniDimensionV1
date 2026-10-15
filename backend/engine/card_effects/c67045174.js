/**
 * [Passcode: 67045174] Gemini Trap Hole
 * Tipo: Trap
 * Arquetipo: General
 */
module.exports = {
    id: 67045174,
    name: "Gemini Trap Hole",
    type: "Trap",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
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

        // Efecto: Destruir todos los monstruos del rival
        let destroyedCount = 0;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i]) {
                const mon = oppMonsters[i];
                oppMonsters[i] = null;
                effectUtils.sendCardToGraveyard(duelState, opponentKey, mon);
                destroyedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚡💥 [${this.name}] ¡Destruyó todos los monstruos (${destroyedCount}) en el campo rival!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
