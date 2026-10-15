/**
 * [Passcode: 76862289] Yamata Dragon
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 76862289,
    name: "Yamata Dragon",
    type: "Spirit Effect Monster",
    atk: 2600,
    def: 3100,
    level: 7,
    race: "Dragon",
    attribute: "FIRE",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },

    async onInflictBattleDamage(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.hand = p.hand || [];
            let drawn = 0;
            while (p.hand.length < 5 && p.deck && p.deck.length > 0) {
                p.hand.push(p.deck.shift());
                drawn++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `🐉🔥 [Yamata Dragon] ¡Infligió daño de combate! Roba ${drawn} cartas hasta tener 5 en la mano.`, 'monster');
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
