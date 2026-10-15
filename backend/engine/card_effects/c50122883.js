/**
 * [Passcode: 50122883] Bite Shoes
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 50122883,
    name: "Bite Shoes",
    type: "Flip Effect Monster",
    atk: 500,
    def: 300,
    level: 2,
    race: "Fiend",
    attribute: "DARK",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const faceUpMon = (opp?.monsters || []).find(m => m && !m.faceDown);
            if (faceUpMon) {
                faceUpMon.position = faceUpMon.position === 'ATK' ? 'DEF' : 'ATK';
                effectUtils.emitDuelLog(duelState.roomId, `👞🦷 [Bite Shoes] ¡EFECTO DE VOLTEO! Cambia la posición de batalla de "${faceUpMon.card_data?.name || 'Monstruo'}" a ${faceUpMon.position}.`, 'flip');
            }
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
