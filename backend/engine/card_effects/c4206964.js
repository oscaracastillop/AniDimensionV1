/**
 * [Passcode: 4206964] Trap Hole (Agujero Trampa)
 * Tipo: Normal Trap | Expansión: LOB
 * Descripción Oficial: When your opponent Normal or Flip Summons 1 monster with 1000 or more ATK: Target that monster; destroy that target.
 */
module.exports = {
    id: 4206964,
    name: "Trap Hole",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const pending = duelState.pendingAction;
        if (pending && (pending.type === 'SUMMON' || pending.type === 'FLIP_SUMMON') && pending.player === oppKey) {
            const atk = Number(pending.cardData?.atk || 0);
            if (atk >= 1000) {
                return { canActivate: true, targetSlot: pending.slot_index };
            }
        }
        // Fallback: permitir activación si el oponente invocó este turno un monstruo de >= 1000 ATK
        const oppMons = (duelState[oppKey]?.monsters || []).filter(m => m && !m.faceDown && (m.currentAtk || m.card_data?.atk || 0) >= 1000 && m.turnSummoned === duelState.turnNumber);
        if (oppMons.length > 0) {
            return { canActivate: true };
        }

        return { canActivate: false, reason: "Solo puede activarse cuando tu adversario Invoca de Modo Normal o por Volteo un monstruo con 1000 o más ATK." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        if (!opp || !opp.monsters) return { success: false };

        let targetSlot = targetData?.slot_index !== undefined ? targetData.slot_index : duelState.pendingAction?.slot_index;
        if (targetSlot === undefined || targetSlot < 0 || !opp.monsters[targetSlot]) {
            targetSlot = opp.monsters.findIndex(m => m && !m.faceDown && (m.currentAtk || m.card_data?.atk || 0) >= 1000);
        }

        if (targetSlot !== -1 && opp.monsters[targetSlot]) {
            const targetMon = opp.monsters[targetSlot];
            const tName = targetMon.card_data?.name || targetMon.name || 'Monstruo';
            effectUtils.sendCardToGraveyard(duelState, targetMon, oppKey);
            opp.monsters[targetSlot] = null;

            effectUtils.emitDuelLog(
                duelState.roomId,
                `🕳️💥 [Trap Hole] ¡"${tName}" cae en el Agujero Trampa y es destruido al ser invocado!`,
                'trap'
            );
            return { success: true };
        }

        return { success: false, reason: "No se encontró el monstruo objetivo." };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
