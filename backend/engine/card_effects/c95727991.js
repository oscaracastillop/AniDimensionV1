/**
 * [Passcode: 95727991] Catapult Turtle
 * Tipo: Effect Monster
 */
module.exports = {
    id: 95727991,
    name: "Catapult Turtle",
    type: "Effect Monster",
    atk: 1000,
    def: 2000,
    level: 5,
    race: "Aqua",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const myMonSlot = (duelState[playerKey]?.monsters || []).findIndex(m => m !== null);
        if (myMonSlot !== -1) {
            const tMon = duelState[playerKey].monsters[myMonSlot];
            const halfAtk = Math.floor((tMon.currentAtk !== undefined ? tMon.currentAtk : (tMon.card_data?.atk || 0)) / 2);
            duelState[playerKey].monsters[myMonSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, tMon, playerKey);
            duelState[opponentKey].lp = Math.max(0, (duelState[opponentKey].lp || 8000) - halfAtk);
            effectUtils.emitDuelLog(duelState.roomId, `🐢💥 [Catapult Turtle] ¡Lanza a "${tMon.card_data ? tMon.card_data.name : 'Monstruo'}" e inflige ${halfAtk} de daño a ${duelState[opponentKey].username}!`, 'damage');
            effectUtils.checkDuelGameOver(duelState.roomId, duelState);
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🐢 [Catapult Turtle] No hay monstruos para tributar.`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
