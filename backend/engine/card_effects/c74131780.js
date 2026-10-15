/**
 * [Passcode: 74131780] Exiled Force
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 74131780,
    name: "Exiled Force",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const hasTarget = (duelState[oppKey]?.monsters || []).some(m => m);
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos en el campo rival para destruir." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Se ofrece en tributo a sí mismo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 74131780);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }

            // Destruye 1 monstruo objetivo
            const tMon = (opp.monsters || []).find(m => m);
            if (tMon) {
                const idx = opp.monsters.indexOf(tMon);
                opp.monsters[idx] = null;
                effectUtils.sendCardToGraveyard(duelState, tMon, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `🗡️💥 [Exiled Force] ¡Se ofrece en tributo! Destruye a "${tMon.name || tMon.card_data?.name}" en el campo rival.`, 'monster');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
