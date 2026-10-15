/**
 * [Passcode: 38538445] Fushi No Tori
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 38538445,
    name: "Fushi No Tori",
    type: "Spirit Effect Monster",
    atk: 1200,
    def: 0,
    level: 4,
    race: "Winged Beast",
    attribute: "FIRE",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },

    async onInflictBattleDamage(context) {
            const { duelState, playerKey, damageAmount, effectUtils } = context;
            const p = duelState[playerKey];
            p.lifePoints = (p.lifePoints || 0) + (damageAmount || 1200);
            effectUtils.emitDuelLog(duelState.roomId, `🔥🦅 [Fushi No Tori] Recupera LP igual al daño infligido (+${damageAmount || 1200} LP, LP: ${p.lifePoints}).`, 'monster');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
