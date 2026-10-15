/**
 * [Passcode: 33066139] Reaper of the Cards (Segador de Cartas)
 * Tipo: Flip Effect Monster | Expansión: LOB
 * Descripción Oficial: FLIP: Target 1 Trap Card on the field; destroy that target. (If the target is Set, reveal it, then destroy it if it is a Trap Card. Otherwise, return it to its original position.)
 */
module.exports = {
    id: 33066139,
    name: "Reaper of the Cards",
    type: "Flip Effect Monster",
    atk: 1380,
    def: 1930,
    level: 5,
    race: "Fiend",
    isFlip: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: false, reason: "Los efectos de Volteo se activan automáticamente al voltear la carta boca arriba." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.spells) return { success: true };

        let destroyed = false;
        for (let i = 0; i < 5; i++) {
            const s = opp.spells[i];
            if (s) {
                const cd = s.card_data || s;
                const t = (cd.type || s.type || '').toLowerCase();
                const isTrap = t.includes('trap') || t.includes('trampa') || (Number(cd.typeCode || 0) & 0x4);
                if (isTrap) {
                    effectUtils.sendCardToGraveyard(duelState, s, oppKey);
                    opp.spells[i] = null;
                    destroyed = true;
                    effectUtils.emitDuelLog(duelState.roomId, `💀🃏 [Reaper of the Cards] ¡El Segador siega y destruye "${cd.name || 'Carta de Trampa'}"!`, 'flip');
                    break;
                }
            }
        }

        if (!destroyed) {
            effectUtils.emitDuelLog(duelState.roomId, `💀 [Reaper of the Cards] No se encontró ninguna Carta de Trampa para destruir.`, 'flip');
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
