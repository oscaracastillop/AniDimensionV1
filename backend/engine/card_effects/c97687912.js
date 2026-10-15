/**
 * [Passcode: 97687912] Fairy Meteor Crush
 * Tipo: Equip Spell | Expansión: PSV
 */
module.exports = {
    id: 97687912,
    name: "Fairy Meteor Crush",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) {
            return Boolean(target);
        },

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
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const targetMonster = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMonster || targetMonster.faceDown) return { success: false, reason: "Objetivo inválido." };

            targetMonster.hasPiercing = true;
            targetMonster.equippedCards = targetMonster.equippedCards || [];
            targetMonster.equippedCards.push(this.id);

            effectUtils.emitDuelLog(duelState.roomId, `☄️🧚 [Fairy Meteor Crush] ¡Equipado a "${targetMonster.card_data?.name || 'Monstruo'}"! Concede daño de penetración contra monstruos en Defensa.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
