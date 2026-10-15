/**
 * [Passcode: 88733579] Drill Bug
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 88733579,
    name: "Drill Bug",
    type: "Effect Monster",
    atk: 1100,
    def: 200,
    level: 2,
    race: "Insect",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const pIdx = (p.deck || []).findIndex(c => Number(c.card_id || c.id) === 27911549);
            if (pIdx !== -1) {
                const [card] = p.deck.splice(pIdx, 1);
                p.hand.push(card);
                effectUtils.emitDuelLog(duelState.roomId, `🪲🔩 [Drill Bug] ¡Añade 1 "Parasite Paracide" desde el Deck a la mano tras infligir daño de batalla!`, 'monster');
            }
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
