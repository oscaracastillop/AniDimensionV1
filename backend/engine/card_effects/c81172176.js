/**
 * [Passcode: 81172176] Fiend Comedian
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 81172176,
    name: "Fiend Comedian",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const p = duelState[playerKey];
            const opp = duelState[oppKey];

            const coinFlip = Math.random() >= 0.5 ? 'CARA' : 'CRUZ';
            if (coinFlip === 'CARA') {
                // CARA: Destierra todas las cartas del Cementerio rival
                const count = (opp.graveyard || []).length;
                opp.banished = opp.banished || [];
                while (opp.graveyard && opp.graveyard.length > 0) {
                    opp.banished.push(opp.graveyard.pop());
                }
                effectUtils.emitDuelLog(duelState.roomId, `🎭🪙 [Fiend Comedian] Resultado: CARA. ¡Destierra las ${count} cartas del Cementerio de ${opp.username}!`, 'trap');
            } else {
                // CRUZ: Envía cartas del tope de tu Deck al Cementerio igual a la cantidad de cartas en el Cementerio rival
                const oppGyCount = (opp.graveyard || []).length;
                let sent = 0;
                for (let i = 0; i < oppGyCount && p.deck && p.deck.length > 0; i++) {
                    const c = p.deck.shift();
                    effectUtils.sendCardToGraveyard(duelState, c, playerKey);
                    sent++;
                }
                effectUtils.emitDuelLog(duelState.roomId, `🎭🪙 [Fiend Comedian] Resultado: CRUZ. Envía ${sent} cartas del tope de tu Deck al Cementerio.`, 'trap');
            }
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
