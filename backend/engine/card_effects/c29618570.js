/**
 * [Passcode: 29618570] Gray Wing
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 29618570,
    name: "Gray Wing",
    type: "Effect Monster",
    atk: 1300,
    def: 700,
    level: 3,
    race: "Dragon",
    attribute: "WIND",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if (!p?.hand || p.hand.length === 0) return { canActivate: false, reason: "Requiere descartar 1 carta de la mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.hand && p.hand.length > 0) {
                const discarded = p.hand.shift();
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 29618570);
                if (selfSlot !== -1 && p.monsters[selfSlot]) {
                    p.monsters[selfSlot].canAttackTwice = true;
                    effectUtils.emitDuelLog(duelState.roomId, `🦅 [Gray Wing] Descarta 1 carta para poder atacar 2 veces durante esta Battle Phase.`, 'monster');
                }
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
