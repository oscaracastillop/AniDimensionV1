/**
 * [Passcode: 53046408] Emergency Provisions
 * Tipo: Quick-Play Spell | Expansión: LOD
 */
module.exports = {
    id: 53046408,
    name: "Emergency Provisions",
    type: "Quick-Play Spell",
    race: "Spell",
    isQuickPlay: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const otherCards = (p?.spells || []).filter(s => s && Number(s.card_id || s.card_data?.id) !== 53046408);
            if (otherCards.length === 0) return { canActivate: false, reason: "Se requiere enviar otras Magias/Trampas al Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let sentCount = 0;
            (p.spells || []).forEach((s, idx) => {
                if (s && Number(s.card_id || s.card_data?.id) !== 53046408) {
                    effectUtils.sendCardToGraveyard(duelState, s, playerKey);
                    p.spells[idx] = null;
                    sentCount++;
                }
            });
            const lpGain = sentCount * 1000;
            p.lifePoints = (p.lifePoints || 0) + lpGain;
            effectUtils.emitDuelLog(duelState.roomId, `🥫✨ [Emergency Provisions] Envía ${sentCount} cartas Mágicas/Trampas al Cementerio y recupera ${lpGain} LP (LP: ${p.lifePoints}).`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
