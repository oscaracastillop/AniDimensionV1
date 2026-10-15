/**
 * [Passcode: 71829750] Serpentine Princess
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 71829750,
    name: "Serpentine Princess",
    type: "Effect Monster",
    atk: 1400,
    def: 2000,
    level: 4,
    race: "Reptile",
    attribute: "WATER",

    canActivate() { return { canActivate: false, reason: "Efecto disparado al volver al Deck." }; },

    async onReturnedToDeck(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const monIdx = (p.deck || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 3);
            if (monIdx !== -1) {
                const mon = p.deck.splice(monIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    mon.position = 'face-up-attack';
                    p.monsters[emptySlot] = mon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐍👑 [Serpentine Princess] Al regresar al Deck, Invoca de Modo Especial a "${mon.name || mon.card_data?.name}" (Nv.${mon.level || mon.card_data?.level}) desde el Deck.`, 'monster');
                }
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
