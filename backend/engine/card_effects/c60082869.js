/**
 * [Passcode: 60082869] Dust Tornado
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 60082869,
    name: "Dust Tornado",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSpellTrapRemoval: true,

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasTarget = (duelState[oppKey]?.spells || []).some(s => s) || Boolean(duelState[oppKey]?.fieldSpell);
            if (!hasTarget) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const p = duelState[playerKey];
            const targetSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.spells || []).findIndex(s => s);

            if (targetSlot !== -1 && opp.spells?.[targetSlot]) {
                const destroyed = opp.spells[targetSlot];
                opp.spells[targetSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [Dust Tornado] ¡Destruye "${destroyed.card_data?.name || 'M/T'}" del rival!`, 'trap');
            } else if (opp.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                effectUtils.sendCardToGraveyard(duelState, fs, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [Dust Tornado] ¡Destruye el Campo Mágico rival "${fs.card_data?.name || 'Campo'}"!`, 'trap');
            }

            // Permite colocar 1 M/T de la mano
            const stHandIdx = (p.hand || []).findIndex(c => {
                const t = (c.card_data?.type || c.type || '').toLowerCase();
                return t.includes('spell') || t.includes('trap');
            });
            const freeSTSlot = (p.spells || []).findIndex(s => !s);
            if (stHandIdx !== -1 && freeSTSlot !== -1) {
                const [setCard] = p.hand.splice(stHandIdx, 1);
                setCard.faceDown = true;
                setCard.position = 'SET';
                p.spells[freeSTSlot] = setCard;
                effectUtils.emitDuelLog(duelState.roomId, `🌪️📦 [Dust Tornado] ${p.username} coloca 1 Carta Mágica/Trampa desde su mano boca abajo.`, 'trap');
            }

            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
