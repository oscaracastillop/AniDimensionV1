/**
 * [Passcode: 31829185] Dark Necrofear
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 31829185,
    name: "Dark Necrofear",
    type: "Effect Monster",
    atk: 2200,
    def: 2800,
    level: 8,
    race: "Fiend",
    attribute: "DARK",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const fiendsInGY = (p?.graveyard || []).filter(c => ((c.race || c.card_data?.race || '').toLowerCase() === 'fiend'));
            if (fiendsInGY.length < 3) return { canActivate: false, reason: "Se requieren al menos 3 monstruos Demonio en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banished = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banished < 3; i--) {
                const c = p.graveyard[i];
                if ((c.race || c.card_data?.race || '').toLowerCase() === 'fiend') {
                    p.banished.push(p.graveyard.splice(i, 1)[0]);
                    banished++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `💀🖤 [Dark Necrofear] ¡Invocada de Modo Especial desterrando 3 monstruos Demonio del Cementerio!`, 'monster');
            return { success: true };
        },

    async onEndPhaseGY(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const p = duelState[playerKey];

            // Si fue destruida en la Monster Zone por carta del rival y enviada al Cementerio este turno
            const oppMonsters = (opp.monsters || []).map((m, idx) => ({ m, idx })).filter(x => x.m);
            if (oppMonsters.length > 0) {
                const target = oppMonsters[0];
                const stolenMon = opp.monsters[target.idx];
                opp.monsters[target.idx] = null;
                const pSlot = p.monsters.findIndex(m => !m);
                if (pSlot !== -1) {
                    p.monsters[pSlot] = stolenMon;
                    effectUtils.emitDuelLog(duelState.roomId, `👻🎭 [Dark Necrofear] ¡Posee y toma control de "${stolenMon.name || stolenMon.card_data?.name}" del rival desde el Cementerio!`, 'monster');
                }
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
