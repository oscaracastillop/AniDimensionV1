/**
 * [Passcode: 49681811] Freed the Matchless General
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 49681811,
    name: "Freed the Matchless General",
    type: "Effect Monster",
    atk: 2300,
    def: 1700,
    level: 5,
    race: "Warrior",
    attribute: "EARTH",
    immuneToSpellTargeting: true,

    canActivate() { return { canActivate: true }; },

    async onDrawPhaseReplace(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const wIdx = (p.deck || []).findIndex(c => (c.race || c.card_data?.race || '').toLowerCase() === 'warrior' && (c.level || c.card_data?.level || 0) <= 4);
            if (wIdx !== -1) {
                const warrior = p.deck.splice(wIdx, 1)[0];
                p.hand.push(warrior);
                effectUtils.emitDuelLog(duelState.roomId, `🛡️🎖️ [Freed the Matchless General] En lugar de robar, añade a "${warrior.name || warrior.card_data?.name}" (Guerrero Nv.${warrior.level || warrior.card_data?.level}) a la mano. Inmune a Magias dirigidas.`, 'monster');
                return { success: true, drawReplaced: true };
            }
            return { success: false };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDrawPhaseReplace({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
