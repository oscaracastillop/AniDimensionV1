/**
 * [Passcode: 52675689] Invitation to a Dark Sleep
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 52675689,
    name: "Invitation to a Dark Sleep",
    type: "Effect Monster",
    atk: 1500,
    def: 1800,
    level: 5,
    race: "Spellcaster",
    attribute: "DARK",

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasOppMon = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasOppMon) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para dormir." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const target = (opp?.monsters || []).find(m => m && !m.faceDown);
            if (target) {
                target.cannotAttack = true;
                effectUtils.emitDuelLog(duelState.roomId, `💤🌙 [Invitation to a Dark Sleep] ¡Duerme a "${target.card_data?.name || 'Monstruo'}"! No puede declarar ataques mientras esta carta permanezca boca arriba.`, 'monster');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
