/**
 * [Passcode: 20765952] Mask of Dispel
 * Tipo: Continuous Spell | Expansión: LON
 */
module.exports = {
    id: 20765952,
    name: "Mask of Dispel",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allSpells = [...(duelState[playerKey]?.spells || []), ...(duelState[oppKey]?.spells || [])];
            const hasFaceUpSpell = allSpells.some(s => s && !s.faceDown && (s.card_data?.type || s.type || '').toLowerCase().includes('spell'));
            if (!hasFaceUpSpell) return { canActivate: false, reason: "No hay Cartas Mágicas boca arriba en el campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎭📜 [Mask of Dispel] ¡Equipada a una Carta Mágica boca arriba! Su controlador recibe 500 de daño en cada una de sus Standby Phases.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
