/**
 * [Passcode: 92408984] The Dragon's Bead
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 92408984,
    name: "The Dragon's Bead",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮🐉 [The Dragon's Bead] Trampa continua activa: Descarta 1 carta para negar Trampas que designen como objetivo a tus Dragones.`, 'trap');
            return { success: true };
        },

    async onNegateTrap(context) {
            const { duelState, playerKey, trapCard, effectUtils } = context;
            const p = duelState[playerKey];
            // Descarta 1 carta de la mano para negar una Trampa que designe a un Dragón
            if (p?.hand && p.hand.length > 0) {
                const discarded = p.hand.shift();
                effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);
                effectUtils.emitDuelLog(duelState.roomId, `🔮🐉 [The Dragon's Bead] Descarta "${discarded.name || discarded.card_data?.name}" y niega la Trampa "${trapCard?.name || 'Trampa'}".`, 'trap');
                return { success: true, negated: true };
            }
            return { success: false };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
