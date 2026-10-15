/**
 * [Passcode: 56948373] Mask of the Accursed
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 56948373,
    name: "Mask of the Accursed",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) { return Boolean(target); },

    getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || opponentKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            target.cannotAttack = true;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🎭 cursed [Mask of the Accursed] ¡Equipada a "${target.card_data?.name || 'Monstruo'}"! No puede atacar y su controlador recibirá 500 de daño en su Standby Phase.`, 'spell');
            return { success: true };
        },

    onStandby({ duelState, playerKey, effectUtils }) {
            const p = duelState[playerKey];
            if (p) {
                p.lp = Math.max(0, (p.lp || 8000) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🎭💥 [Mask of the Accursed] ${p.username} recibe 500 puntos de daño en su Standby Phase. (LP: ${p.lp})`, 'damage');
            }
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
