/**
 * [Passcode: 78010363] Witch of the Black Forest
 * Tipo: Effect Monster
 */
module.exports = {
    id: 78010363,
    name: "Witch of the Black Forest",
    type: "Effect Monster",
    atk: 1100,
    def: 1200,
    level: 4,
    race: "Spellcaster",
    
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const p = duelState[playerKey];
        p.deck = p.deck || [];
        p.hand = p.hand || [];
        const sIdx = p.deck.findIndex(c => (c.def !== undefined && c.def <= 1500) || (c.card_data?.def !== undefined && c.card_data.def <= 1500));
        if (sIdx !== -1) {
            const [found] = p.deck.splice(sIdx, 1);
            p.hand.push(found);
            p.mainDeckCount = p.deck.length;
            const cName = found.name || found.card_data?.name || 'Monstruo';
            effectUtils.emitDuelLog(duelState.roomId, `🧙‍♀️✨ [Witch of the Black Forest] ¡Añade a "${cName}" (DEF <= 1500) del mazo a su mano!`, 'effect');
            return { success: true };
        }
        effectUtils.emitDuelLog(duelState.roomId, `🧙‍♀️ [Witch of the Black Forest] No se encontraron monstruos con <= 1500 DEF en el mazo.`, 'effect');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
