/**
 * [Passcode: 41855169] Jowgen the Spiritualist
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 41855169,
    name: "Jowgen the Spiritualist",
    type: "Effect Monster",
    atk: 200,
    def: 1300,
    level: 3,
    race: "Spellcaster",
    attribute: "LIGHT",
    preventsSpecialSummon: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if (!p?.hand || p.hand.length === 0) return { canActivate: false, reason: "Requiere descartar 1 carta de la mano." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            // Descartar 1 carta al azar
            const rIdx = Math.floor(Math.random() * p.hand.length);
            const discarded = p.hand.splice(rIdx, 1)[0];
            effectUtils.sendCardToGraveyard(duelState, discarded, playerKey);

            // Destruir todos los monstruos Invocados de Modo Especial en el campo
            let destroyed = 0;
            [p, opp].forEach(player => {
                (player.monsters || []).forEach((m, idx) => {
                    if (m && m.isSpecialSummoned) {
                        effectUtils.sendCardToGraveyard(duelState, m, player === p ? playerKey : oppKey);
                        player.monsters[idx] = null;
                        destroyed++;
                    }
                });
            });

            effectUtils.emitDuelLog(duelState.roomId, `🧘‍♂️⚡ [Jowgen the Spiritualist] Descarta 1 carta al azar y destruye ${destroyed} monstruos Invocados de Modo Especial en el campo. Ningún jugador puede Invocar de Modo Especial.`, 'monster');
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
