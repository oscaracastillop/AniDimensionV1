/**
 * [Passcode: 12800777] Garuda the Wind Spirit
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 12800777,
    name: "Garuda the Wind Spirit",
    type: "Effect Monster",
    atk: 1600,
    def: 1200,
    level: 4,
    race: "Winged Beast",
    attribute: "WIND",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const windInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WIND'));
            if (windInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de VIENTO en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'WIND');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🦅🌪️ [Garuda the Wind Spirit] Invocada de Modo Especial desterrando 1 monstruo de VIENTO del Cementerio.`, 'monster');
            return { success: true };
        },

    async onOpponentEndPhase(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `🦅 [Garuda the Wind Spirit] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}" durante la End Phase rival.`, 'monster');
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
