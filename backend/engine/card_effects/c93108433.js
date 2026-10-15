/**
 * [Passcode: 93108433] Monster Recovery
 * Tipo: Quick-Play Spell | Expansión: PSV
 */
module.exports = {
    id: 93108433,
    name: "Monster Recovery",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m && !m.faceDown);
            const targetMon = p.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo no válido." };

            const handCount = p.hand.length;
            p.monsters[tSlot] = null;
            p.deck.push(targetMon);
            while (p.hand.length > 0) {
                p.deck.push(p.hand.pop());
            }

            // Barajar deck
            p.deck.sort(() => Math.random() - 0.5);

            // Robar cartas iguales a las que tenía en mano
            for (let i = 0; i < handCount; i++) {
                if (p.deck.length > 0) p.hand.push(p.deck.pop());
            }

            effectUtils.emitDuelLog(duelState.roomId, `🌀🃏 [Monster Recovery] Devuelve "${targetMon.card_data?.name || 'Monstruo'}" y la mano al Deck, baraja y roba ${handCount} carta(s).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
