/**
 * [Passcode: 40916023] Aqua Spirit
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 40916023,
    name: "Aqua Spirit",
    type: "Effect Monster",
    atk: 1600,
    def: 1200,
    level: 4,
    race: "Aqua",
    attribute: "WATER",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const waterInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WATER'));
            if (waterInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de AGUA en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WATER');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `💧 [Aqua Spirit] Invocada de Modo Especial desterrando 1 monstruo de AGUA del Cementerio.`, 'monster');
            return { success: true };
        },

    async onOpponentStandbyPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                targetMon.cannotChangePositionTurn = duelState.turnCount;
                effectUtils.emitDuelLog(duelState.roomId, `💧🌊 [Aqua Spirit] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}" durante la Standby Phase rival.`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
