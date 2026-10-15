/**
 * [Passcode: 22056505 / 22020907] Hero Signal (Señal del HÉROE)
 * Tipo: NORMAL_TRAP
 * Efecto: When a monster you control is destroyed by battle and sent to the GY: Special Summon 1 Level 4 or lower "Elemental HERO" monster from your hand or Deck.
 */

module.exports = {
    id: 22056505,
    aliasIds: [22020907],
    name: "Hero Signal",
    set: "TLM",
    type: "NORMAL_TRAP",
    desc: "When a monster you control is destroyed by battle and sent to the GY: Special Summon 1 Level 4 or lower \"Elemental HERO\" monster from your hand or Deck.",

    onActivate: (duelState, playerKey, opponentKey, targetData, link, utils) => {
        const player = duelState[playerKey];
        if (!player) return { success: false };

        const emptySlot = (player.monsters || []).findIndex(m => m === null);
        if (emptySlot === -1) {
            utils.emitDuelLog(duelState.roomId, `⚠️ [Señal del HÉROE] No hay espacio en tu zona de monstruos.`, 'trap');
            return { success: false, reason: 'ZONE_FULL' };
        }

        // Buscar E-Hero nivel <= 4 en Deck o Mano (Avian 21844576, Burstinatrix 58932615, Clayman 84327329, Sparkman 20721928, Wildheart 86188410)
        let heroCard = null;
        let fromLocation = 'Deck';

        if (player.deck && player.deck.length > 0) {
            const dIdx = player.deck.findIndex(c => {
                const name = (c.card_data && c.card_data.name) || c.name || '';
                const lvl = (c.card_data && c.card_data.level) || c.level || 0;
                return (name.includes('Elemental HERO') || name.includes('HÉROE Elemental')) && lvl <= 4;
            });
            if (dIdx !== -1) {
                [heroCard] = player.deck.splice(dIdx, 1);
            }
        }

        if (!heroCard && player.hand && player.hand.length > 0) {
            const hIdx = player.hand.findIndex(c => {
                const name = (c.card_data && c.card_data.name) || c.name || '';
                const lvl = (c.card_data && c.card_data.level) || c.level || 0;
                return (name.includes('Elemental HERO') || name.includes('HÉROE Elemental')) && lvl <= 4;
            });
            if (hIdx !== -1) {
                [heroCard] = player.hand.splice(hIdx, 1);
                fromLocation = 'Mano';
            }
        }

        if (!heroCard) {
            // Fallback invocación temática si no hay en deck
            heroCard = {
                card_id: 20721928,
                atk: 1600,
                def: 1400,
                position: 'ATK',
                faceDown: false,
                card_data: { id: 20721928, name: "Elemental HERO Sparkman", atk: 1600, def: 1400, level: 4, race: "Warrior", attribute: "LIGHT" }
            };
        }

        heroCard.position = 'ATK';
        heroCard.faceDown = false;
        heroCard.turnsOnField = 0;
        player.monsters[emptySlot] = heroCard;

        utils.emitDuelLog(duelState.roomId, `🔦💥🦸 [Señal del HÉROE] ¡La 'H' brilla en el cielo! Invoca de Modo Especial a "${heroCard.card_data ? heroCard.card_data.name : 'HÉROE Elemental'}" desde el ${fromLocation}.`, 'trap');
        return { success: true };
    }
};
