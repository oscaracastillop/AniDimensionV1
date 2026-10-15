/**
 * [Passcode: 31560081] Magician of Faith
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 31560081,
    name: "Magician of Faith",
    type: "Flip Effect Monster",
    atk: 300,
    def: 400,
    level: 1,
    race: "Spellcaster",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const gy = duelState[playerKey]?.graveyard || [];
        const spellIdx = gy.findIndex(c => (c.type || '').includes('Spell') || c.card_data?.type?.includes('Spell'));
        if (spellIdx !== -1) {
            const [recovered] = gy.splice(spellIdx, 1);
            duelState[playerKey].hand = duelState[playerKey].hand || [];
            duelState[playerKey].hand.push(recovered);
            const sName = recovered.name || recovered.card_data?.name || 'Magia';
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♀️✨ [Magician of Faith] ¡EFECTO DE VOLTEO! Recupera "${sName}" del cementerio a la mano.`, 'effect');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🧙‍♀️ [Magician of Faith] No hay Cartas Mágicas en el Cementerio.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
