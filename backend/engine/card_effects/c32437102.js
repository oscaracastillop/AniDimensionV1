/**
 * [Passcode: 32437102] Dragonic Attack
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 32437102,
    name: "Dragonic Attack",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(target) {
            if (!target) return false;
            const r = (target.card_data?.race || target.race || '').toLowerCase();
            return r.includes('warrior') || r.includes('guerrero');
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
            const hasWarrior = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasWarrior) return { canActivate: false, reason: "No hay monstruos de Tipo Guerrero boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown || !this.canEquip(target.card_data || target)) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 500;
            target.currentDef = (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) + 500;
            target.race = "Dragon";
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🐉⚔️ [Dragonic Attack] ¡Equipada a "${target.card_data?.name || 'Guerrero'}"! (+500 ATK/DEF y se convierte en Tipo Dragón).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
