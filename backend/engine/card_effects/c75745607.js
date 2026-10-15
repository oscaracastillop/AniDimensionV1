/**
 * [Passcode: 75745607] Hino-Kagu-Tsuchi
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 75745607,
    name: "Hino-Kagu-Tsuchi",
    type: "Spirit Effect Monster",
    atk: 2800,
    def: 2900,
    level: 8,
    race: "Pyro",
    attribute: "FIRE",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de batalla." }; },

    async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.discardHandNextDrawPhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `🔥💥 [Hino-Kagu-Tsuchi] ¡Llamarada destructiva! ${opp.username} deberá descartar toda su mano durante su próximo Draw Phase antes de robar.`, 'monster');
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
