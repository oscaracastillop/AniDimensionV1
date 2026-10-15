/**
 * [Passcode: 37684215] Fusion Sword Murasame Blade
 * Tipo: Equip Spell | Expansión: LOD
 */
module.exports = {
    id: 37684215,
    name: "Fusion Sword Murasame Blade",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,
    cannotBeDestroyedBySpells: true,

    canEquip(targetMonster, isOwnMonster) {
            if (!targetMonster) return false;
            const cd = targetMonster.card_data || targetMonster;
            const race = (cd.race || '').toLowerCase();
            return race.includes('warrior') || race.includes('guerrero');
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
            const hasWarrior = (p?.monsters || []).some(m => m && this.canEquip(m, true)) ||
                               (opp?.monsters || []).some(m => m && this.canEquip(m, false));
            if (!hasWarrior) return { canActivate: false, reason: "No hay monstruos de Tipo Guerrero boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + 800;
            effectUtils.emitDuelLog(duelState.roomId, `🗡️⚔️ [Fusion Sword Murasame Blade] Equipada a "${targetMon.name || targetMon.card_data?.name}". Gana +800 ATK (ATK actual: ${targetMon.currentAtk}). Inmune a destrucción por Magias.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
