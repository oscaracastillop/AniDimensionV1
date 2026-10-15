/**
 * [Passcode: 72345736] Six Samurai United
 * Tipo: Continuous Spell
 * Coloca 1 Contador Bushido (máx 2) por cada Six Samurai invocado.
 * Se envía al Cementerio para robar 1 carta por cada Contador Bushido (1 o 2).
 */
module.exports = {
    id: 72345736,
    name: "Six Samurai United",
    type: "Continuous Spell",
    isContinuous: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pSpells = player.spells || [];
        const pHand = player.hand || [];
        const pDeck = player.deck || [];
        
        let slotIdx = pSpells.findIndex(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 72345736);
        let cardInZone = slotIdx !== -1 ? pSpells[slotIdx] : null;

        // Si es la primera activación desde mano
        if (!cardInZone || (cardInZone.bushidoCounters === undefined && !targetData)) {
            effectUtils.emitDuelLog(duelState.roomId, `🏯✨ [Six Samurai United] Activada en el campo. Acumulará hasta 2 Contadores Bushido por cada invocación "Six Samurai".`, 'spell');
            return { success: true };
        }

        const counters = cardInZone.bushidoCounters || 0;
        if (counters <= 0) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Six Samurai United] Tiene 0 Contadores Bushido. No puedes robar cartas todavía.`, 'warning');
            return { success: false, reason: 'Sin contadores' };
        }

        // Enviar al cementerio y robar
        pSpells[slotIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, cardInZone, playerKey);
        const drawNum = Math.min(counters, 2);
        let drawn = 0;
        for (let i = 0; i < drawNum; i++) {
            if (pDeck.length > 0) {
                pHand.push(pDeck.pop());
                drawn++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🏯🏺✨ [Six Samurai United] Enviada al Cementerio con ${counters} Contadores Bushido. ¡${player.username || 'Jugador'} roba ${drawn} carta(s)!`, 'spell');
        return { success: true };
    }
};