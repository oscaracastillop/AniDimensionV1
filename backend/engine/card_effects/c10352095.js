/**
 * [Passcode: 10352095] Scroll of Bewitchment
 * Tipo: Equip Spell | Expansión: LON
 */
module.exports = {
    id: 10352095,
    name: "Scroll of Bewitchment",
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
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            const declaredAttr = targetData?.declared_attribute || "DARK";
            target.attribute = declaredAttr;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `📜🔮 [Scroll of Bewitchment] ¡Cambia el Atributo de "${target.card_data?.name || 'Monstruo'}" a ${declaredAttr}!`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
