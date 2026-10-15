/**
 * [Passcode: 47596607] Skyscraper 2 - Hero City
 * Tipo: Spell
 * Arquetipo: General
 */
module.exports = {
    id: 47596607,
    name: "Skyscraper 2 - Hero City",
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
        playerField.fieldSpell = { card_id: 47596607, card_data: { id: 47596607, name: this.name } };
        effectUtils.emitDuelLog(duelState.roomId, `🌌 [${this.name}] ¡El Campo Mágico "${this.name}" envuelve todo el duelo!`, 'field');

        // Invocación Especial desde el Cementerio
        const freeSlot = pMonsters.findIndex(m => m === null);
        if (freeSlot !== -1) {
            let revived = null;
            let gySourceKey = playerKey;
            const gyIdx = pGY.findIndex(c => (!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined))));
            if (gyIdx !== -1) { revived = pGY.splice(gyIdx, 1)[0]; gySourceKey = playerKey; }
            else if (oppGY.length > 0) {
                const oppIdx = oppGY.findIndex(c => (!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined))));
                if (oppIdx !== -1) { revived = oppGY.splice(oppIdx, 1)[0]; gySourceKey = opponentKey; }
            }
            if (revived) {
                pMonsters[freeSlot] = { card_id: revived.id || revived.card_id, position: 'ATK', faceDown: false, card_data: revived };
                effectUtils.emitDuelLog(duelState.roomId, `✨⭐ [${this.name}] ¡Invoca de Modo Especial a "${revived.name || 'Monstruo'}" desde el Cementerio!`, 'summon');
            }
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
