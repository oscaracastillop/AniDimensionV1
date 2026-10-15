/**
 * [Passcode: 5494820] Cyclon Laser
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 5494820,
    name: "Cyclon Laser",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) {
            if (!target) return false;
            const name = (target.card_data?.name || target.name || '').toLowerCase();
            return name.includes('gradius');
        },

    getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasGradius = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasGradius) return { canActivate: false, reason: "No hay ningún \"Gradius\" boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown || !this.canEquip(target.card_data || target)) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 300;
            target.hasPiercing = true;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🚀🔴 [Cyclon Laser] ¡Equipado a "Gradius"! (+300 ATK y daño de batalla de penetración).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
