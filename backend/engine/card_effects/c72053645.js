/**
 * [Passcode: 72053645] Weather Report
 * Tipo: Flip Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 72053645,
    name: "Weather Report",
    type: "Flip Effect Monster",
    atk: 950,
    def: 1500,
    level: 4,
    race: "Aqua",
    attribute: "WATER",
    isFlip: true,

    async onFlip(context) {
        const { duelState, playerKey, opponentKey, effectUtils } = context;
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const opp = duelState[oppKey];
        let destroyedSwords = 0;
        if (opp && opp.spells) {
            for (let i = 0; i < 5; i++) {
                const s = opp.spells[i];
                if (s && ((s.name || '').toLowerCase().includes('swords') || Number(s.id) === 72302403)) {
                    effectUtils.sendCardToGraveyard(duelState, s, oppKey);
                    opp.spells[i] = null;
                    destroyedSwords++;
                }
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `☀️✨ [Volteo: ${this.name}] ¡Informe Meteorológico destruye ${destroyedSwords} Espadas de la Luz Reveladora del rival!`, 'flip');
        return { success: true };
    },

    async execute(context) {
        return this.onFlip(context);
    }
};
