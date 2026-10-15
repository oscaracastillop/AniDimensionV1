/**
 * [Passcode: 41142615] The Cheerful Coffin
 * Tipo: Normal Spell
 */
module.exports = {
    id: 41142615,
    name: "The Cheerful Coffin",
    type: "Normal Spell",
    race: "Spell",
    

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        const p = duelState[playerKey];
        p.hand = p.hand || [];
        let discarded = 0;
        for (let i = p.hand.length - 1; i >= 0 && discarded < 3; i--) {
            const c = p.hand[i];
            const isMon = (!((c.type || '').toLowerCase().includes('spell') || (c.type || '').toLowerCase().includes('trap')) && ((c.type || '').toLowerCase().includes('monster') || (c.atk !== null && c.atk !== undefined)));
            if (isMon) {
                p.hand.splice(i, 1);
                effectUtils.sendCardToGraveyard(duelState, c, playerKey);
                discarded++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `⚰️✨ [The Cheerful Coffin] ¡Descarta ${discarded} cartas de monstruo al cementerio!`, 'spell');
        return { success: true, discarded };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
