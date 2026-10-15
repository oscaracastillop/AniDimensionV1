/**
 * [Passcode: 3643300] The Legendary Fisherman
 * Tipo: Effect Monster | Expansión: PSV
 */
module.exports = {
    id: 3643300,
    name: "The Legendary Fisherman",
    type: "Effect Monster",
    atk: 1850,
    def: 1600,
    level: 5,
    race: "Warrior",
    attribute: "WATER",

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (hasUmi) {
                effectUtils.emitDuelLog(duelState.roomId, `🎣🌊 [The Legendary Fisherman] Con Umi en el campo, es inmune a Cartas Mágicas y no puede ser seleccionado como objetivo de ataque.`, 'monster');
            }
            return { success: true, immune: hasUmi };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
