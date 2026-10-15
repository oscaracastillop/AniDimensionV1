/**
 * [Passcode: 11102908] Shien's Castle of Mist
 * Tipo: Spell
 * Arquetipo: General
 */
module.exports = {
    id: 11102908,
    name: "Shien's Castle of Mist",
    type: "Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "Field",
    isEquip: false,
    isField: true,
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

        // Campo Mágico Oficial
        if (playerField.fieldSpell) { effectUtils.sendCardToGraveyard(duelState, playerKey, playerField.fieldSpell); }
        playerField.fieldSpell = { card_id: 11102908, card_data: { id: 11102908, name: this.name } };
        effectUtils.emitDuelLog(duelState.roomId, `🌌 [${this.name}] ¡El Campo Mágico "${this.name}" envuelve todo el duelo!`, 'field');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
