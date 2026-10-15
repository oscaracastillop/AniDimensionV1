/**
 * [Passcode: 7841112] Majestic Star Dragon
 * Tipo: Synchro Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 7841112,
    name: "Majestic Star Dragon",
    type: "Synchro Effect Monster",
    atk: 3800,
    def: 3000,
    level: 10,
    race: "Dragon",
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
