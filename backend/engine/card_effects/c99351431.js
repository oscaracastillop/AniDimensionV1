/**
 * [Passcode: 99351431] The Secret of the Bandit
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 99351431,
    name: "The Secret of the Bandit",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasMon = (p?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para seleccionar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const mon = (p.monsters || []).find(m => m);
            if (mon) {
                mon.discardOnBattleDamage = true;
                effectUtils.emitDuelLog(duelState.roomId, `🗡️💰 [The Secret of the Bandit] Cada vez que "${mon.name || mon.card_data?.name}" inflija daño de batalla este turno, el rival descartará 1 carta al azar.`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
