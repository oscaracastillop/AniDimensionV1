/**
 * [Passcode: 97077563] Call of the Haunted
 * Tipo: Continuous Trap | Expansión: PSV
 */
module.exports = {
    id: 97077563,
    name: "Call of the Haunted",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey }) {
            const hasMonInGY = (duelState[playerKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            const hasSpace = (duelState[playerKey]?.monsters || []).some(m => !m);
            if (!hasMonInGY || !hasSpace) return { canActivate: false, reason: "Requiere un monstruo en tu Cementerio y espacio libre en campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const gyIdx = targetData?.gy_index !== undefined ? targetData.gy_index : (p.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster'));
            if (gyIdx === -1 || !p.graveyard?.[gyIdx]) return { success: false, reason: "Monstruo no encontrado." };

            const slotIdx = (p.monsters || []).findIndex(m => !m);
            if (slotIdx === -1) return { success: false, reason: "No hay espacio." };

            const revived = p.graveyard.splice(gyIdx, 1)[0];
            revived.position = 'ATK';
            revived.faceDown = false;
            revived.callOfTheHauntedLinked = true;
            p.monsters[slotIdx] = revived;

            effectUtils.emitDuelLog(duelState.roomId, `👻🕯️ [Call of the Haunted] ¡Invoca a "${revived.card_data?.name || revived.name}" en Modo Ataque! Si esta trampa deja el campo, el monstruo es destruido.`, 'special_summon');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
