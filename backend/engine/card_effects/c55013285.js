/**
 * [Passcode: 55013285] Troop Dragon
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 55013285,
    name: "Troop Dragon",
    type: "Effect Monster",
    atk: 700,
    def: 800,
    level: 2,
    race: "Dragon",
    attribute: "WIND",

    canActivate() { return { canActivate: false, reason: "Efecto disparado al destruirse en batalla." }; },

    async onDestroyedByBattle(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const dIdx = (p.deck || []).findIndex(c => Number(c.id || c.card_id) === 55013285);
            if (dIdx !== -1) {
                const dragon = p.deck.splice(dIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    dragon.position = 'face-up-defense';
                    p.monsters[emptySlot] = dragon;
                    effectUtils.emitDuelLog(duelState.roomId, `🐉🛡️ [Troop Dragon] ¡Destruido en batalla! Invoca de Modo Especial otro "Troop Dragon" desde el Deck.`, 'monster');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDestroyedByBattle({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
