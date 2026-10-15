/**
 * [Passcode: 70797118] Thunder Nyan Nyan
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 70797118,
    name: "Thunder Nyan Nyan",
    type: "Effect Monster",
    atk: 1900,
    def: 800,
    level: 4,
    race: "Thunder",
    attribute: "LIGHT",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de autodestrucción." }; },

    async onCheckFieldPresence(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const hasNonLight = (p?.monsters || []).some(m => m && (m.attribute || m.card_data?.attribute || '').toUpperCase() !== 'LIGHT');
            if (hasNonLight && p?.monsters?.[slotIndex]) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[slotIndex], playerKey);
                p.monsters[slotIndex] = null;
                effectUtils.emitDuelLog(duelState.roomId, `⚡🐱 [Thunder Nyan Nyan] Se autodestruye al haber un monstruo que no es de LUZ en tu campo.`, 'monster');
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
