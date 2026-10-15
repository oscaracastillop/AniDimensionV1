/**
 * [Passcode: 28933734] Mask of Darkness
 * Tipo: Flip Effect Monster
 */
module.exports = {
    id: 28933734,
    name: "Mask of Darkness",
    type: "Flip Effect Monster",
    atk: 900,
    def: 400,
    level: 2,
    race: "Fiend",
    isFlip: true,

    
    async onFlip(context) {
        const { duelState, playerKey, effectUtils } = context;
        const gy = duelState[playerKey]?.graveyard || [];
        const trapIdx = gy.findIndex(c => (c.type || '').includes('Trap') || c.card_data?.type?.includes('Trap'));
        if (trapIdx !== -1) {
            const [recovered] = gy.splice(trapIdx, 1);
            duelState[playerKey].hand = duelState[playerKey].hand || [];
            duelState[playerKey].hand.push(recovered);
            const tName = recovered.name || recovered.card_data?.name || 'Trampa';
            effectUtils.emitDuelLog(duelState.roomId, `🎭✨ [Mask of Darkness] ¡EFECTO DE VOLTEO! Recupera "${tName}" del cementerio a la mano.`, 'effect');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🎭 [Mask of Darkness] No hay Cartas de Trampa en el Cementerio.`, 'effect');
        return { success: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onFlip({ duelState, playerKey, opponentKey, targetData, link, effectUtils });
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
