/**
 * [Passcode: 15653824] Skull Knight #2
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 15653824,
    name: "Skull Knight #2",
    type: "Effect Monster",
    atk: 1000,
    def: 1200,
    level: 3,
    race: "Fiend",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto disparado al ser tributado." }; },

    async onTributedForFiend(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const deckIdx = (p.deck || []).findIndex(c => Number(c.id || c.card_id) === 15653824);
            if (deckIdx !== -1) {
                const knight = p.deck.splice(deckIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    knight.position = 'face-up-attack';
                    p.monsters[emptySlot] = knight;
                    effectUtils.emitDuelLog(duelState.roomId, `💀🛡️ [Skull Knight #2] ¡Tributado por un Demonio! Invoca de Modo Especial otro "Skull Knight #2" desde el Deck.`, 'monster');
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
