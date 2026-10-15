/**
 * [Passcode: 54652250] Man-Eater Bug (Bicho Come-Hombres)
 * Tipo: Flip Effect Monster | Expansión: LOB
 * Descripción Oficial: FLIP: Target 1 monster on the field; destroy that target.
 */
module.exports = {
    id: 54652250,
    name: "Man-Eater Bug",
    type: "Flip Effect Monster",
    atk: 450,
    def: 600,
    level: 2,
    race: "Insect",
    isFlip: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: false, reason: "Los efectos de Volteo se activan automáticamente al voltear la carta boca arriba." };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        let targetMon = null;
        let targetOwner = oppKey;
        let targetSlot = -1;

        if (targetData && targetData.slot_index !== undefined) {
            targetOwner = targetData.target_player || oppKey;
            targetSlot = targetData.slot_index;
            targetMon = duelState[targetOwner]?.monsters?.[targetSlot];
        }

        if (!targetMon) {
            // Seleccionar el monstruo rival con mayor ATK
            let maxAtk = -1;
            const oppMons = duelState[oppKey]?.monsters || [];
            oppMons.forEach((m, idx) => {
                if (m) {
                    const atk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                    if (atk > maxAtk) {
                        maxAtk = atk;
                        targetSlot = idx;
                        targetMon = m;
                        targetOwner = oppKey;
                    }
                }
            });
        }

        if (targetMon && targetSlot !== -1) {
            const tName = targetMon.card_data?.name || targetMon.name || 'Monstruo';
            effectUtils.sendCardToGraveyard(duelState, targetMon, targetOwner);
            duelState[targetOwner].monsters[targetSlot] = null;

            effectUtils.emitDuelLog(
                duelState.roomId,
                `🐛💥 [Man-Eater Bug] ¡El Bicho Come-Hombres devora y destruye a "${tName}"!`,
                'flip'
            );
            return { success: true };
        }

        effectUtils.emitDuelLog(duelState.roomId, `🐛 [Man-Eater Bug] No hay monstruos válidos en el campo para destruir.`, 'flip');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
