/**
 * [Passcode: 57409948] Bombardment Beetle
 * Tipo: Flip Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 57409948,
    name: "Bombardment Beetle",
    type: "Flip Effect Monster",
    atk: 400,
    def: 900,
    level: 2,
    race: "Insect",
    attribute: "WIND",
    isFlip: true,

    canActivate() { return { canActivate: true }; },

    async onFlip(context) {
            const { duelState, playerKey, opponentKey, effectUtils } = context;
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const faceDownMon = (opp?.monsters || []).find(m => m && m.faceDown);
            if (faceDownMon) {
                faceDownMon.faceDown = false;
                faceDownMon.position = 'DEF';
                effectUtils.emitDuelLog(duelState.roomId, `🪲💣 [Bombardment Beetle] ¡EFECTO DE VOLTEO! Voltea a "${faceDownMon.card_data?.name || 'Monstruo'}" a Posición de Defensa boca arriba (sin activar su efecto de volteo).`, 'flip');
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
