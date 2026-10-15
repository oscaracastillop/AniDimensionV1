/**
 * [Passcode: 37620434] Shadow Tamer
 * Tipo: Flip Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 37620434,
    name: "Shadow Tamer",
    type: "Flip Effect Monster",
    atk: 800,
    def: 700,
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
            const targetFiendIdx = (opp.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'fiend');
            if (targetFiendIdx !== -1) {
                const stolenFiend = opp.monsters[targetFiendIdx];
                opp.monsters[targetFiendIdx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenFiend;
                    effectUtils.emitDuelLog(duelState.roomId, `⛓️👿 [Shadow Tamer] ¡VOLTEO! Toma el control de "${stolenFiend.name || stolenFiend.card_data?.name}" del rival hasta el final del turno.`, 'flip');
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
