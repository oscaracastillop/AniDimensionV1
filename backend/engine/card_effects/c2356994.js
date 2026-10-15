/**
 * [Passcode: 2356994] Great Long Nose
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 2356994,
    name: "Great Long Nose",
    type: "Spirit Effect Monster",
    atk: 1900,
    def: 1700,
    level: 5,
    race: "Beast-Warrior",
    attribute: "DARK",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },

    async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.skipNextBattlePhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `👺 [Great Long Nose] Infligió daño de batalla: ${opp.username} saltará su próxima Battle Phase.`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onInflictBattleDamage({ duelState, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
