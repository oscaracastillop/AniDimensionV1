/**
 * [Passcode: 16475472] Lesser Fiend
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 16475472,
    name: "Lesser Fiend",
    type: "Effect Monster",
    atk: 2100,
    def: 1000,
    level: 5,
    race: "Fiend",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto continuo de combate." }; },

    async onMonsterDestroyedByBattle(context) {
            const { duelState, opponentKey, destroyedMonster, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (destroyedMonster && opp) {
                opp.banished = opp.banished || [];
                opp.banished.push(destroyedMonster);
                effectUtils.emitDuelLog(duelState.roomId, `👿🌀 [Lesser Fiend] Destierra del juego al monstruo que destruyó en combate ("${destroyedMonster.name || destroyedMonster.card_data?.name}").`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
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
