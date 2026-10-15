/**
 * [Passcode: 76263644] Destiny End Dragoon
 * Tipo: Fusion
 * Arquetipo: General
 */
module.exports = {
    id: 76263644,
    name: "Destiny End Dragoon",
    type: "Fusion",
    atk: 3000,
    def: 3000,
    level: 10,
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

        // Destrucción Dirigida de Monstruo
        let targetIdx = oppMonsters.findIndex(m => m !== null);
        if (targetIdx !== -1) {
            const destroyed = oppMonsters[targetIdx];
            oppMonsters[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
            effectUtils.emitDuelLog(duelState.roomId, `💥 [${this.name}] ¡Destruyó a "${destroyed.card_data ? destroyed.card_data.name : 'Monstruo'}" del rival!`, 'effect');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `✨ [${this.name}] Efecto activado en el duelo.`, 'effect');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
