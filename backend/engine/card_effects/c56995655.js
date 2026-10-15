/**
 * [Passcode: 56995655] Ominous Fortunetelling
 * Tipo: Continuous Trap | Expansión: LOD
 */
module.exports = {
    id: 56995655,
    name: "Ominous Fortunetelling",
    type: "Continuous Trap",
    race: "Trap",
    isContinuous: true,
    isTrap: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🔮 [Ominous Fortunetelling] Trampa continua activa: En tu Standby Phase adivina 1 carta al azar de la mano rival; si aciertas el tipo, inflige 500 de daño.`, 'trap');
            return { success: true };
        },

    async onStandbyPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            if (opp?.hand && opp.hand.length > 0) {
                const rCard = opp.hand[Math.floor(Math.random() * opp.hand.length)];
                // Si la carta seleccionada al azar es un monstruo, inflige 500 de daño
                if ((!((rCard.type || '').toLowerCase().includes('spell') || (rCard.type || '').toLowerCase().includes('trap')) && ((rCard.type || '').toLowerCase().includes('monster') || (rCard.atk !== null && rCard.atk !== undefined)))) {
                    opp.lifePoints = Math.max(0, (opp.lifePoints || 0) - 500);
                    effectUtils.emitDuelLog(duelState.roomId, `🔮 [Ominous Fortunetelling] Adivinación acertada: Selecciona "${rCard.name || rCard.card_data?.name}" (Monstruo) e inflige 500 daño a ${opp.username} (LP: ${opp.lifePoints}).`, 'trap');
                }
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
