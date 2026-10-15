/**
 * [Passcode: 18036057] Airknight Parshath
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 18036057,
    name: "Airknight Parshath",
    type: "Effect Monster",
    atk: 1900,
    def: 1400,
    level: 5,
    race: "Fairy",
    attribute: "LIGHT",
    hasPiercing: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },

    async onInflictBattleDamage(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.deck && p.deck.length > 0) {
                p.hand = p.hand || [];
                const drawn = p.deck.shift();
                p.hand.push(drawn);
                effectUtils.emitDuelLog(duelState.roomId, `🕊️⚔️ [Airknight Parshath] ¡Infligió daño de combate (perforación)! Roba 1 carta del Deck ("${drawn.name || drawn.card_data?.name}").`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
