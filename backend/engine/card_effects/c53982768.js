/**
 * [Passcode: 53982768] Dark Ruler Ha Des
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 53982768,
    name: "Dark Ruler Ha Des",
    type: "Effect Monster",
    atk: 2450,
    def: 1600,
    level: 6,
    race: "Fiend",
    attribute: "DARK",
    cannotSpecialSummonFromGY: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },

    async onFiendDestroyedMonsterByBattle(context) {
            const { duelState, destroyedMonster, effectUtils } = context;
            if (destroyedMonster) {
                destroyedMonster.effectsNegated = true;
                effectUtils.emitDuelLog(duelState.roomId, `👑👿 [Dark Ruler Ha Des] El Demonio destruyó a "${destroyedMonster.name || destroyedMonster.card_data?.name}" en combate: Niega sus efectos de forma permanente.`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
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
