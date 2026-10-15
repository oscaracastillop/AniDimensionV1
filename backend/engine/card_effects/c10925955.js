/**
 * [Passcode: 10925955] Contact with the Aquamirror
 * Tipo: Normal Spell
 * Expansión: EXVC
 * Efecto OCG:
 * Selecciona 1 monstruo de AGUA en tu Cementerio; aplica 1 de estos efectos:
 * ● Añádelo a tu mano.
 * ● Barájalo en tu Deck.
 */
module.exports = {
    id: 10925955,
    name: "Contact with the Aquamirror",
    type: "Normal Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pGY = player.graveyard || [];
        const pHand = player.hand || [];
        const pDeck = player.deck || [];

        // Buscar monstruo de AGUA en Cementerio
        const waterIdx = pGY.findIndex(c => c && (
            c.attribute === 'WATER' || 
            c.attributeCode === 0x2 || 
            c.card_data?.attribute === 'WATER' ||
            (c.card_data?.desc || '').toLowerCase().includes('water')
        ));

        if (waterIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, `💧 [Contact with the Aquamirror] No hay monstruos de AGUA en tu Cementerio.`, 'info');
            return { success: false, reason: 'No WATER monsters in GY' };
        }

        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;
        const [waterCard] = pGY.splice(waterIdx, 1);
        const cardName = waterCard.card_data?.name || waterCard.name || 'Monstruo de AGUA';

        if (choice === 1) {
            // Opción 1: Añadir a la mano
            pHand.push(waterCard.card_data || waterCard);
            effectUtils.emitDuelLog(duelState.roomId, `💧✋ [Contact with the Aquamirror] ¡Opción 1: Añadido "${cardName}" a tu mano!`, 'search');
        } else {
            // Opción 2: Barajar en el Deck
            pDeck.push(waterCard.card_data || waterCard);
            // Barajar
            for (let i = pDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pDeck[i], pDeck[j]] = [pDeck[j], pDeck[i]];
            }
            effectUtils.emitDuelLog(duelState.roomId, `💧🔀 [Contact with the Aquamirror] ¡Opción 2: Barajado "${cardName}" en tu Deck!`, 'deck');
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
