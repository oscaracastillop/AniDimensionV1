/**
 * [Passcode: 86346643] Rainbow Neos
 * Tipo: Fusion Effect Monster (Level 10, ATK 4500, DEF 3000)
 * Expansión: PTDN
 * Efecto OCG: Una vez por turno, activa 1 de estos efectos:
 * 1: Enviar 1 monstruo que controles al GY; baraja todos los monstruos del rival en su Deck.
 * 2: Enviar 1 Magia/Trampa que controles al GY; baraja todas las Magias/Trampas del rival en su Deck.
 * 3: Enviar la carta superior de tu Deck al GY; baraja todas las cartas en el Cementerio del rival en su Deck.
 */
module.exports = {
    id: 86346643,
    name: "Rainbow Neos",
    type: "Fusion Effect Monster",
    atk: 4500,
    def: 3000,
    level: 10,
    race: "Warrior",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Costo: enviar 1 monstruo propio al GY
            const pMonsters = player.monsters || [];
            const fodderIdx = pMonsters.findIndex(m => m !== null);
            if (fodderIdx === -1) {
                return { success: false, reason: 'Debes controlar al menos 1 monstruo para enviar al Cementerio como costo.' };
            }
            const fodder = pMonsters[fodderIdx];
            pMonsters[fodderIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, fodder, playerKey);

            // Efecto: devolver todos los monstruos rivales a su Deck
            let returnedCount = 0;
            (opp.monsters || []).forEach((m, idx) => {
                if (m) {
                    opp.monsters[idx] = null;
                    if (!opp.deck) opp.deck = [];
                    opp.deck.push(m.card_data || m);
                    returnedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌈🌪️ [${this.name}] ¡Envió '${fodder.name || 'Monstruo'}' al Cementerio y barajó ${returnedCount} monstruo(s) rivales en su Deck!`, 'effect');
            return { success: true, choice: 1, returnedCount };
        } else if (choice === 2) {
            // Costo: enviar 1 Magia/Trampa propia al GY
            const pSpells = player.spells || [];
            const fodderIdx = pSpells.findIndex(s => s !== null);
            if (fodderIdx === -1) {
                return { success: false, reason: 'Debes controlar al menos 1 Magia/Trampa para enviar al Cementerio como costo.' };
            }
            const fodder = pSpells[fodderIdx];
            pSpells[fodderIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, fodder, playerKey);

            // Efecto: devolver todas las Magias/Trampas rivales a su Deck
            let returnedCount = 0;
            (opp.spells || []).forEach((s, idx) => {
                if (s) {
                    opp.spells[idx] = null;
                    if (!opp.deck) opp.deck = [];
                    opp.deck.push(s.card_data || s);
                    returnedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌈🌪️ [${this.name}] ¡Envió '${fodder.name || 'Magia/Trampa'}' al Cementerio y barajó ${returnedCount} Magia(s)/Trampa(s) rivales en su Deck!`, 'effect');
            return { success: true, choice: 2, returnedCount };
        } else {
            // Costo: enviar carta superior de tu Deck al GY
            player.deck = player.deck || [];
            if (player.deck.length === 0) {
                return { success: false, reason: 'No tienes cartas en tu Deck para enviar al Cementerio como costo.' };
            }
            const milled = player.deck.pop();
            effectUtils.sendCardToGraveyard(duelState, milled, playerKey);

            // Efecto: devolver todo el Cementerio rival a su Deck
            const oppGy = opp.graveyard || [];
            const gyCount = oppGy.length;
            if (!opp.deck) opp.deck = [];
            while (oppGy.length > 0) {
                opp.deck.push(oppGy.pop());
            }
            effectUtils.emitDuelLog(duelState.roomId, `🌈🌪️ [${this.name}] ¡Envió '${milled.name || 'Carta'}' al Cementerio y barajó las ${gyCount} cartas del Cementerio rival en su Deck!`, 'effect');
            return { success: true, choice: 3, returnedCount: gyCount };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
