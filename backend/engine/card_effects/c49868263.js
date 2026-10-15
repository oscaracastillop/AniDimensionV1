/**
 * [Passcode: 49868263] Ryu Senshi
 * Tipo: Fusion Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 49868263,
    name: "Ryu Senshi",
    type: "Fusion Effect Monster",
    atk: 2000,
    def: 1200,
    level: 6,
    race: "Warrior",
    attribute: "EARTH",
    isFusion: true,
    fusionMaterials: [75953262,67957315],
    immuneToSpellTargeting: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Requiere pagar 1000 LP." };
            return { canActivate: true };
        },

    async onNegateTrap(context) {
            const { duelState, playerKey, trapCard, effectUtils } = context;
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) > 1000) {
                p.lifePoints -= 1000;
                effectUtils.emitDuelLog(duelState.roomId, `⚔️🚫 [Ryu Senshi] Paga 1000 LP (LP: ${p.lifePoints}) y niega la Carta de Trampa Normal "${trapCard?.name || 'Trampa'}". Inmune a efectos de Magias que lo designen.`, 'monster');
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
