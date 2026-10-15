/**
 * [Passcode: 54031490] Shien's Smoke Signal
 * Tipo: Normal Spell
 * Añade 1 monstruo "Six Samurai" de Nivel 3 o menor del Deck a la mano.
 */
module.exports = {
    id: 54031490,
    name: "Shien's Smoke Signal",
    type: "Normal Spell",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pHand = player.hand || [];

        const searchIdx = pDeck.findIndex(c => {
            const cd = c.card_data || c;
            const cName = (cd.name || c.name || '').toLowerCase();
            const isSixSam = cName.includes('six samurai') || cName.includes('seis samurai');
            const lvl = Number(cd.level || c.level || 0);
            return isSixSam && lvl > 0 && lvl <= 3;
        });

        if (searchIdx !== -1) {
            const [found] = pDeck.splice(searchIdx, 1);
            pHand.push(found);
            effectUtils.emitDuelLog(duelState.roomId, `💨🔍 [Shien's Smoke Signal] ¡Añade a "${found.name}" (Nivel ${found.level || 3}) del Deck a la mano!`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, `💨 [Shien's Smoke Signal] No se encontraron monstruos Six Samurai de Nivel 3 o menor en el Deck.`, 'spell');
        }
        return { success: true };
    }
};