/**
 * [Passcode: 77036039] Assault Mercenary
 * Tipo: Effect Monster
 * Arquetipo: General
 */
module.exports = {
    id: 77036039,
    name: "Assault Mercenary",
    type: "Effect Monster",
    atk: 1800,
    def: 300,
    level: 4,
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

        // Destrucción Dirigida de Magia/Trampa
        let targetIdx = oppSpells.findIndex(s => s !== null);
        if (targetIdx !== -1) {
            const destroyed = oppSpells[targetIdx];
            oppSpells[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, opponentKey, destroyed);
            effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [${this.name}] ¡Destruyó una Carta Mágica/Trampa rival!`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `✨ [${this.name}] Efecto activado en el duelo.`, 'spell');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
