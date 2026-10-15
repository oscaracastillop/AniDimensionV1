/**
 * [Passcode: 70368879] Upstart Goblin
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 70368879,
    name: "Upstart Goblin",
    type: "Normal Spell",
    race: "Spell",
    isDrawCard: true,

    canActivate({ duelState, playerKey }) {
        const p = duelState[playerKey];
        if (!p || !p.deck || p.deck.length === 0) {
            return { canActivate: false, reason: "No tienes cartas en el Deck para robar." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        if (p.deck.length > 0) {
            const card = p.deck.pop();
            p.hand.push(card);
            p.mainDeckCount = p.deck.length;
        }

        if (opp) {
            opp.lp = (opp.lp || 8000) + 1000;
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            `👺✨ [${this.name}] ¡${p.username} roba 1 carta de su Deck y ${opp ? opp.username : 'el rival'} gana 1000 LP! (LP rival: ${opp ? opp.lp : 9000})`,
            'spell'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
