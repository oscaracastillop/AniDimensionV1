/**
 * [Passcode: 80071763] Dark Balter the Terrible
 * Tipo: Fusion Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 80071763,
    name: "Dark Balter the Terrible",
    type: "Fusion Effect Monster",
    atk: 2000,
    def: 1200,
    level: 5,
    race: "Fiend",
    attribute: "DARK",
    isFusion: true,
    fusionMaterials: [52860176,38742075],

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Requiere pagar 1000 LP." };
            return { canActivate: true };
        },

    async onMonsterDestroyedByBattle(context) {
            const { duelState, destroyedMonster, effectUtils } = context;
            if (destroyedMonster) {
                destroyedMonster.effectsNegated = true;
                effectUtils.emitDuelLog(duelState.roomId, `👿💀 [Dark Balter the Terrible] Destruyó a "${destroyedMonster.name || destroyedMonster.card_data?.name}" en combate y niega sus efectos de forma permanente.`, 'monster');
            }
            return { success: true };
        },

    async onNegateSpell(context) {
            const { duelState, playerKey, spellCard, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) {
                p.lifePoints -= 1000;
                effectUtils.emitDuelLog(duelState.roomId, `👿🚫 [Dark Balter the Terrible] Paga 1000 LP (LP: ${p.lifePoints}) y niega la Carta Mágica Normal "${spellCard?.name || 'Mágica'}".`, 'monster');
                return { success: true, negated: true };
            }
            return { success: false };
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
