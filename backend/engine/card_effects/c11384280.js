/**
 * [Passcode: 11384280] Cannon Soldier
 * Tipo: Effect Monster
 */
module.exports = {
    id: 11384280,
    name: "Cannon Soldier",
    type: "Effect Monster",
    atk: 1400,
    def: 1300,
    level: 4,
    race: "Machine",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const myMonSlot = (duelState[playerKey]?.monsters || []).findIndex(m => m !== null);
        if (myMonSlot !== -1) {
            const tMon = duelState[playerKey].monsters[myMonSlot];
            duelState[playerKey].monsters[myMonSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
            duelState[opponentKey].lp = Math.max(0, (duelState[opponentKey].lp || 8000) - 500);
            effectUtils.emitDuelLog(duelState.roomId, `💣💥 [Cannon Soldier] ¡Sacrifica a "${tMon.card_data ? tMon.card_data.name : 'Monstruo'}" e inflige 500 de daño a ${duelState[opponentKey].username}!`, 'damage');
            effectUtils.checkDuelGameOver(duelState.roomId, duelState);
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `💣 [Cannon Soldier] No hay monstruos para tributar.`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
