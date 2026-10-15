/**
 * [Passcode: 83994646] 4-Starred Ladybug of Doom
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 83994646,
    name: "4-Starred Ladybug of Doom",
    type: "Flip Effect Monster",
    atk: 800,
    def: 1200,
    level: 3,
    race: "Insect",
    attribute: "WIND",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            let destroyedCount = 0;
            (opp?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && (m.card_data?.level || m.level) === 4) {
                    opp.monsters[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, oppKey);
                    destroyedCount++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `🐞💥 [4-Starred Ladybug of Doom] ¡EFECTO DE VOLTEO! Destruye ${destroyedCount} monstruo(s) boca arriba de Nivel 4 del oponente.`, 'flip');
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onFlip({ duelState, playerKey, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
