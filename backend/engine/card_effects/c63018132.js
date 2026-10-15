/**
 * [Passcode: 63018132] Dragon Manipulator
 * Tipo: Flip Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 63018132,
    name: "Dragon Manipulator",
    type: "Flip Effect Monster",
    atk: 700,
    def: 800,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targetDragonIdx = (opp.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon');
            if (targetDragonIdx !== -1) {
                const stolenDragon = opp.monsters[targetDragonIdx];
                opp.monsters[targetDragonIdx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenDragon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉🪈 [Dragon Manipulator] ¡VOLTEO! Toma el control de "${stolenDragon.name || stolenDragon.card_data?.name}" del rival hasta el final del turno.`, 'flip');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
