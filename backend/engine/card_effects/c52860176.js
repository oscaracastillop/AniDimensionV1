/**
 * [Passcode: 52860176] Possessed Dark Soul
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 52860176,
    name: "Possessed Dark Soul",
    type: "Effect Monster",
    atk: 1200,
    def: 800,
    level: 3,
    race: "Fiend",
    attribute: "DARK",

    canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasL3 = (duelState[oppKey]?.monsters || []).some(m => m && (m.level || m.card_data?.level || 0) <= 3);
            if (!hasL3) return { canActivate: false, reason: "El rival no tiene monstruos de Nivel 3 o menor boca arriba." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Se ofrece en tributo a sí mismo
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 52860176);
            if (selfSlot !== -1) {
                effectUtils.sendCardToGraveyard(duelState, p.monsters[selfSlot], playerKey);
                p.monsters[selfSlot] = null;
            }

            let stolenCount = 0;
            (opp.monsters || []).forEach((m, idx) => {
                if (m && (m.level || m.card_data?.level || 0) <= 3) {
                    const emptySlot = p.monsters.findIndex(slot => !slot);
                    if (emptySlot !== -1) {
                        opp.monsters[idx] = null;
                        p.monsters[emptySlot] = m;
                        stolenCount++;
                    }
                }
            });

            effectUtils.emitDuelLog(duelState.roomId, `👻👿 [Possessed Dark Soul] Se tributa y toma el control de ${stolenCount} monstruos de Nivel 3 o menor del rival.`, 'monster');
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
