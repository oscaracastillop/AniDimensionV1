/**
 * [Passcode: 62271284] Justi-Break
 * Tipo: Normal Trap Card
 * Arquetipo: General
 */
module.exports = {
    id: 62271284,
    name: "Justi-Break",
    type: "Normal Trap Card",
    atk: 0,
    def: 0,
    level: 0,
    race: "",
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

        // Efecto: Destruir todos los monstruos en el campo
        let count = 0;
        for (let i = 0; i < pMonsters.length; i++) {
            if (pMonsters[i]) { effectUtils.sendCardToGraveyard(duelState, playerKey, pMonsters[i]); pMonsters[i] = null; count++; }
            if (oppMonsters[i]) { effectUtils.sendCardToGraveyard(duelState, opponentKey, oppMonsters[i]); oppMonsters[i] = null; count++; }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🕳️💥 [${this.name}] ¡Un vórtice destruye todos los monstruos (${count}) en el campo!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
