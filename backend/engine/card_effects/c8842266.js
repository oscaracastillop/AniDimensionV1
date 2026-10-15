/**
 * [Passcode: 8842266] Poison of the Old Man
 * Tipo: Quick-Play Spell
 * Arquetipo: General
 * Soporta selección modal reglamentaria OCG (Opción 1: +1200 LP / Opción 2: 800 daño)
 */
module.exports = {
    id: 8842266,
    name: "Poison of the Old Man",
    type: "Quick-Play Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "Quick-Play",
    isEquip: false,
    isField: false,
    isContinuous: false,
    isQuickPlay: true,
    isCounter: false,
    canSpecialSummonSelf: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Opción 1: Recuperar 1200 LP
            player.lp = (player.lp !== undefined ? player.lp : 8000) + 1200;
            effectUtils.emitDuelLog(duelState.roomId, `💖✨ [${this.name}] ¡${player.username || 'Jugador'} recupera 1200 LP! (Total LP: ${player.lp})`, 'heal');
            return { success: true, choice: 1, healed: 1200, currentLp: player.lp };
        } else {
            // Opción 2: Infligir 800 LP de daño al rival
            opponent.lp = Math.max(0, (opponent.lp !== undefined ? opponent.lp : 8000) - 800);
            effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [${this.name}] ¡${opponent.username || 'Rival'} recibe 800 puntos de daño directo! (LP restantes: ${opponent.lp})`, 'damage');
            effectUtils.checkDuelGameOver(duelState.roomId, duelState);
            return { success: true, choice: 2, damage: 800, currentLp: opponent.lp };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
