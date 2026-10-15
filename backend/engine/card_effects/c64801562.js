/**
 * [Passcode: 64801562] Heart of Clear Water
 * Tipo: Equip Spell | Expansión: LOD
 */
module.exports = {
    id: 64801562,
    name: "Heart of Clear Water",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(targetMonster, isOwnMonster) {
            if (!targetMonster) return false;
            const cd = targetMonster.card_data || targetMonster;
            const atk = targetMonster.currentAtk !== undefined ? targetMonster.currentAtk : (cd.atk || 0);
            return atk <= 1300;
        },

    getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const targets = [];
            (p?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, true)) targets.push({ playerKey, slotIndex: idx });
            });
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && this.canEquip(m, false)) targets.push({ playerKey: oppKey, slotIndex: idx });
            });
            return targets;
        },

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasTarget = (p?.monsters || []).some(m => m && this.canEquip(m, true)) ||
                              (opp?.monsters || []).some(m => m && this.canEquip(m, false));
            if (!hasTarget) return { canActivate: false, reason: "No hay monstruos compatibles con 1300 ATK o menos en ningún campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            targetMon.cannotBeDestroyedByBattle = true;
            targetMon.cannotBeTargetedByEffects = true;
            effectUtils.emitDuelLog(duelState.roomId, `💧🛡️ [Heart of Clear Water] Equipada a "${targetMon.name || targetMon.card_data?.name}". No puede ser destruido en batalla ni por efectos mientras su ATK sea <= 1300.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
