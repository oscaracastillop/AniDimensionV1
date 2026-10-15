/**
 * [Passcode: 28596933] A Wingbeat of Giant Dragon
 * Tipo: Normal Spell | Expansión: LOD
 */
module.exports = {
    id: 28596933,
    name: "A Wingbeat of Giant Dragon",
    type: "Normal Spell",
    race: "Spell",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasL5Dragon = (p?.monsters || []).some(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon' && (m.level || m.card_data?.level || 0) >= 5);
            if (!hasL5Dragon) return { canActivate: false, reason: "Requiere 1 monstruo Dragón de Nivel 5 o mayor boca arriba en tu campo." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Devuelve el Dragón Nv 5+ a la mano
            const dIdx = (p.monsters || []).findIndex(m => m && (m.race || m.card_data?.race || '').toLowerCase() === 'dragon' && (m.level || m.card_data?.level || 0) >= 5);
            if (dIdx !== -1) {
                const dragon = p.monsters[dIdx];
                p.monsters[dIdx] = null;
                p.hand.push(dragon);
            }

            // Destruye todas las Magias y Trampas en el campo
            let destroyed = 0;
            [p, opp].forEach(player => {
                (player.spells || []).forEach((s, idx) => {
                    if (s) {
                        effectUtils.sendCardToGraveyard(duelState, s, player === p ? playerKey : oppKey);
                        player.spells[idx] = null;
                        destroyed++;
                    }
                });
            });

            effectUtils.emitDuelLog(duelState.roomId, `🌪️🐉 [A Wingbeat of Giant Dragon] Devuelve un Dragón Nv.5+ a la mano y destruye ${destroyed} cartas Mágicas/Trampas en el campo.`, 'spell');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
