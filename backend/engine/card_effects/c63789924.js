/**
 * [Passcode: 63789924] Smoke Grenade of the Thief
 * Tipo: Equip Spell | Expansión: LOD
 */
module.exports = {
    id: 63789924,
    name: "Smoke Grenade of the Thief",
    type: "Equip Spell",
    race: "Spell",
    isEquip: true,

    canEquip(targetMonster, isOwnMonster) {
            return Boolean(targetMonster);
        },

    getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const targets = [];
            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m) targets.push({ playerKey, slotIndex: idx });
            });
            (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
                if (m) targets.push({ playerKey: oppKey, slotIndex: idx });
            });
            return targets;
        },

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];
            const hasMon = (p?.monsters || []).some(m => m) || (opp?.monsters || []).some(m => m);
            if (!hasMon) return { canActivate: false, reason: "No hay monstruos en el campo para equipar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || targetData?.playerKey || playerKey;
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (targetData?.target_slot || 0);
            const targetMon = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!targetMon) return { success: false, reason: "Monstruo objetivo no encontrado." };
            effectUtils.emitDuelLog(duelState.roomId, `💨 [Smoke Grenade of the Thief] Equipada a "${targetMon.name || targetMon.card_data?.name}". Si esta carta es destruida, descartará 1 carta de la mano rival.`, 'spell');
            return { success: true };
        },

    async onDestroyedWhileEquipped(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.hand && opp.hand.length > 0) {
                const rIdx = Math.floor(Math.random() * opp.hand.length);
                const discarded = opp.hand.splice(rIdx, 1)[0];
                effectUtils.sendCardToGraveyard(duelState, discarded, oppKey);
                effectUtils.emitDuelLog(duelState.roomId, `💨💣 [Smoke Grenade of the Thief] Destruida mientras estaba equipada: Mira la mano del rival y descarta "${discarded.name || discarded.card_data?.name}".`, 'spell');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
