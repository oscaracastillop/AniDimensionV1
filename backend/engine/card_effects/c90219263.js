/**
 * [Passcode: 90219263] Elegant Egotist
 * Tipo: Normal Spell
 */
module.exports = {
    id: 90219263,
    name: "Elegant Egotist",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const hasHarpie = [...(duelState[playerKey].monsters || []), ...(duelState[opponentKey].monsters || [])].some(m => m && (m.card_data?.name?.toLowerCase().includes('harpie lady') || m.card_data?.name?.toLowerCase().includes('dama arpía')));
        if (hasHarpie) {
            const p = duelState[playerKey];
            const emptySlot = p.monsters.findIndex(m => m === null);
            if (emptySlot !== -1) {
                const searchPool = [...(p.hand || []), ...(p.deck || [])];
                const found = searchPool.find(c => c && (c.name?.toLowerCase().includes('harpie lady') || c.card_data?.name?.toLowerCase().includes('harpie lady')));
                if (found) {
                    const fromDeck = p.deck.includes(found);
                    if (fromDeck) { p.deck.splice(p.deck.indexOf(found), 1); p.mainDeckCount = p.deck.length; }
                    else { p.hand.splice(p.hand.indexOf(found), 1); }
                    const cData = found.card_data || found;
                    p.monsters[emptySlot] = {
                        card_id: found.id || found.card_id,
                        position: 'ATK', faceDown: false, hasAttacked: false, turnSummoned: duelState.turnNumber,
                        hasChangedPosition: false, originalOwner: playerKey, card_data: { ...cData, originalOwner: playerKey }
                    };
                    effectUtils.calculateMonsterCurrentStats(p.monsters[emptySlot], duelState, playerKey);
                    effectUtils.emitDuelLog(duelState.roomId, `🪶✨ [Elegant Egotist] ¡Invoca Especialmente a "${cData.name}"!`, 'summon');
                    return { success: true };
                }
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🪶 [Elegant Egotist] Se requiere "Dama Arpía" en el campo.`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
