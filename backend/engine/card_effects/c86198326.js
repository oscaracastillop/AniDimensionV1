/**
 * [Passcode: 86198326] 7 Completed
 * Tipo: Equip Spell | Expansión: PSV
 */
module.exports = {
    id: 86198326,
    name: "7 Completed",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) {
            if (!target) return false;
            const tData = target.card_data || target;
            const r = (tData.race || '').toLowerCase();
            return r.includes('machine') || r.includes('máquina');
        },

    getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) {
                        valid.push({ playerKey: pKey, slotIndex: idx });
                    }
                });
            });
            return valid;
        },

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasValid) return { canActivate: false, reason: "No hay ningún monstruo de Tipo Máquina boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const targetMonster = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMonster || targetMonster.faceDown || !this.canEquip(targetMonster.card_data || targetMonster)) {
                return { success: false, reason: "Objetivo inválido." };
            }
            // Elegir bono de ATK (+700) o DEF (+300). Por defecto +700 ATK
            targetMonster.currentAtk = (targetMonster.currentAtk !== undefined ? targetMonster.currentAtk : (targetMonster.card_data?.atk || 0)) + 700;
            targetMonster.equippedCards = targetMonster.equippedCards || [];
            targetMonster.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `⚙️✨ [7 Completed] ¡Equipado a "${targetMonster.card_data?.name || 'Monstruo'}"! (+700 ATK)`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
