/**
 * [Passcode: 51482758] Remove Trap (Elimina Trampas)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Select 1 face-up Trap Card on the field and destroy it.
 */
module.exports = {
    id: 51482758,
    name: "Remove Trap",
    type: "Normal Spell",
    race: "Spell",
    isSpellTrapRemoval: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const hasFaceupTrap = ['player1', 'player2'].some(pk => {
            return (duelState[pk]?.spells || []).some(s => {
                if (!s || s.faceDown || s.position === 'SET') return false;
                const t = (s.type || s.card_data?.type || '').toLowerCase();
                return t.includes('trap') || t.includes('trampa');
            });
        });

        if (!hasFaceupTrap) {
            return { canActivate: false, reason: "No hay ninguna Carta de Trampa boca arriba en el campo para destruir." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let destroyed = false;
        const targetSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
        const targetPlayer = targetData?.target_player || opponentKey;

        if (targetSlot !== undefined && duelState[targetPlayer]?.spells?.[targetSlot]) {
            const s = duelState[targetPlayer].spells[targetSlot];
            const t = (s.type || s.card_data?.type || '').toLowerCase();
            if (!s.faceDown && (t.includes('trap') || t.includes('trampa'))) {
                effectUtils.sendCardToGraveyard(duelState, s, targetPlayer);
                duelState[targetPlayer].spells[targetSlot] = null;
                destroyed = true;
                effectUtils.emitDuelLog(duelState.roomId, `🧹✨ [Remove Trap] ¡"${s.card_data?.name || 'Trampa'}" boca arriba fue destruida!`, 'spell');
            }
        }

        if (!destroyed) {
            // Destruir la primera trampa boca arriba encontrada
            for (const pk of [opponentKey, playerKey]) {
                const p = duelState[pk];
                if (!p || !p.spells) continue;
                for (let i = 0; i < 5; i++) {
                    const s = p.spells[i];
                    if (s && !s.faceDown) {
                        const t = (s.type || s.card_data?.type || '').toLowerCase();
                        if (t.includes('trap') || t.includes('trampa')) {
                            effectUtils.sendCardToGraveyard(duelState, s, pk);
                            p.spells[i] = null;
                            destroyed = true;
                            effectUtils.emitDuelLog(duelState.roomId, `🧹✨ [Remove Trap] ¡"${s.card_data?.name || 'Trampa'}" boca arriba fue destruida!`, 'spell');
                            break;
                        }
                    }
                }
                if (destroyed) break;
            }
        }

        return { success: destroyed };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
