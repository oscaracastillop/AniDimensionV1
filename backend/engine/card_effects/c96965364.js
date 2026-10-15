/**
 * [Passcode: 96965364] Insect Imitation
 * Tipo: Normal Spell | Expansión: PSV
 */
module.exports = {
    id: 96965364,
    name: "Insect Imitation",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const hasMonster = (duelState[playerKey]?.monsters || []).some(m => m);
            if (!hasMonster) return { canActivate: false, reason: "Debes controlar al menos 1 monstruo para tributar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (p.monsters || []).findIndex(m => m);
            const tribute = p.monsters?.[tSlot];
            if (!tribute) return { success: false, reason: "Monstruo a tributar no encontrado." };

            const tribLevel = tribute.card_data?.level || tribute.level || 1;
            const targetLevel = tribLevel + 1;

            p.monsters[tSlot] = null;
            effectUtils.sendCardToGraveyard(duelState, tribute, playerKey);

            // Buscar Insecto en Deck de Nivel targetLevel
            const insectIdx = (p.deck || []).findIndex(c => {
                const r = (c.card_data?.race || c.race || '').toLowerCase();
                const l = c.card_data?.level || c.level || 0;
                return (r.includes('insect') || r.includes('insecto')) && l === targetLevel;
            });

            if (insectIdx !== -1) {
                const [summoned] = p.deck.splice(insectIdx, 1);
                summoned.position = 'ATK';
                summoned.faceDown = false;
                p.monsters[tSlot] = summoned;
                effectUtils.emitDuelLog(duelState.roomId, `🦗✨ [Insect Imitation] Sacrifica "${tribute.card_data?.name || 'Monstruo'}" e Invoca de Modo Especial a "${summoned.card_data?.name || summoned.name}" (Nv. ${targetLevel}) desde el Deck.`, 'special_summon');
            } else {
                effectUtils.emitDuelLog(duelState.roomId, `🦗 [Insect Imitation] Sacrifica "${tribute.card_data?.name || 'Monstruo'}", pero no se encontró ningún Insecto de Nivel ${targetLevel} en el Deck.`, 'spell');
            }

            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
