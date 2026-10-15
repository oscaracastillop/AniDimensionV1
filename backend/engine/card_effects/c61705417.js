/**
 * [Passcode: 61705417] Graverobber
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 61705417,
    name: "Graverobber",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasSpell = (duelState[oppKey]?.graveyard || []).some(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (!hasSpell) return { canActivate: false, reason: "No hay Cartas Mágicas en el Cementerio del rival." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const p = duelState[playerKey];
            const sIdx = (opp?.graveyard || []).findLastIndex(c => (c.card_data?.type || c.type || '').toLowerCase().includes('spell'));
            if (sIdx === -1) return { success: false, reason: "Magia no encontrada." };

            const [stolenSpell] = opp.graveyard.splice(sIdx, 1);
            stolenSpell.graverobberStolen = true;
            p.hand.push(stolenSpell);

            effectUtils.emitDuelLog(duelState.roomId, `💀🤲 [Graverobber] ¡Roba "${stolenSpell.card_data?.name || 'Magia'}" del Cementerio rival! Al activarla recibirás 2000 puntos de daño.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
