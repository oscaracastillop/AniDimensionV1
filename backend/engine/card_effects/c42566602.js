/**
 * [Passcode: 42566602] The Forceful Sentry
 * Tipo: Normal Spell
 * Efecto: Mira la mano de tu adversario, selecciona 1 carta y devuélvela a su Deck.
 */
module.exports = {
    id: 42566602,
    name: "The Forceful Sentry",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isSpell: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = duelState[opponentKey];
        const player = duelState[playerKey];
        if (!opp || !opp.hand || opp.hand.length === 0) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️ [The Forceful Sentry] ${opp?.username || 'El oponente'} no tiene cartas en mano.`, 'spell');
            return { success: false };
        }

        const pickedIdx = Math.floor(Math.random() * opp.hand.length);
        const [returnedCard] = opp.hand.splice(pickedIdx, 1);
        opp.deck.push(returnedCard);
        // Shuffle deck
        opp.deck.sort(() => Math.random() - 0.5);
        opp.mainDeckCount = opp.deck.length;

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🛡️🔄 [The Forceful Sentry] ¡${player.username} regresó 1 carta de la mano de ${opp.username} (${returnedCard?.name || 'Carta'}) a su Deck!`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
