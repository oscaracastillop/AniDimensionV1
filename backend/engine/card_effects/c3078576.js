/**
 * [Passcode: 3078576] Yata-Garasu
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 3078576,
    name: "Yata-Garasu",
    type: "Spirit Effect Monster",
    atk: 200,
    def: 100,
    level: 2,
    race: "Fiend",
    attribute: "WIND",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: false, reason: "Efecto disparado por daño de combate." }; },

    async onEndPhase(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if (p?.monsters?.[slotIndex]) {
                const mon = p.monsters[slotIndex];
                p.monsters[slotIndex] = null;
                p.hand.push(mon);
                effectUtils.emitDuelLog(duelState.roomId, `🦅 [Yata-Garasu] Regresa del campo a la mano de su dueño durante la End Phase.`, 'monster');
            }
            return { success: true };
        },

    async onInflictBattleDamage(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (opp) {
                opp.skipNextDrawPhase = true;
                effectUtils.emitDuelLog(duelState.roomId, `🦅🔒 [Yata-Garasu] ¡BLOQUEO YATA! Infligió daño de batalla a ${opp.username}: El rival saltará su próximo Draw Phase por completo.`, 'monster');
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
