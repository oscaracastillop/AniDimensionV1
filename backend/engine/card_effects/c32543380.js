/**
 * [Passcode: 32543380] Volcanic Doomfire
 * Tipo: Effect
 * Arquetipo: General
 */
module.exports = {
    id: 32543380,
    name: "Volcanic Doomfire",
    type: "Effect",
    atk: 3000,
    def: 1800,
    level: 8,
    race: "Pyro",
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

        // Efecto de Daño Directo (500 LP)
        opponent.lp = Math.max(0, (opponent.lp || 8000) - 500);
        effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡${opponent.username || 'Rival'} recibe 500 puntos de daño directo! (LP restantes: ${opponent.lp})`, 'damage');
        effectUtils.checkDuelGameOver(duelState.roomId, duelState);

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
