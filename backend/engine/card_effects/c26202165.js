/**
 * [Passcode: 26202165] Sangan
 * Tipo: Effect Monster
 */
module.exports = {
    id: 26202165,
    name: "Sangan",
    type: "Effect Monster",
    atk: 1000,
    def: 600,
    level: 3,
    race: "Fiend",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const p = duelState[playerKey];
        p.deck = p.deck || [];
        p.hand = p.hand || [];
        const sIdx = p.deck.findIndex(c => ((c.type || c.card_data?.type || '').toLowerCase().includes('monster') && ((c.atk !== null && c.atk !== undefined && c.atk <= 1500) || (c.card_data?.atk !== null && c.card_data?.atk !== undefined && c.card_data.atk <= 1500))));
        if (sIdx !== -1) {
            const [found] = p.deck.splice(sIdx, 1);
            p.hand.push(found);
            p.mainDeckCount = p.deck.length;
            const cName = found.name || found.card_data?.name || 'Monstruo';
            effectUtils.emitDuelLog(duelState.roomId, `👁️✨ [Sangan] ¡Añade a "${cName}" (ATK <= 1500) del mazo a su mano!`, 'effect');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `👁️ [Sangan] No se encontraron monstruos con <= 1500 ATK en el mazo.`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
