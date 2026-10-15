/**
 * [Passcode: 12953226] Nuvia the Wicked
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 12953226,
    name: "Nuvia the Wicked",
    type: "Effect Monster",
    atk: 2000,
    def: 800,
    level: 4,
    race: "Fiend",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo." }; },

    async onNormalSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.monsters && p.monsters[slotIndex]) {
                const m = p.monsters[slotIndex];
                effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                p.monsters[slotIndex] = null;
                effectUtils.emitDuelLog(duelState.roomId, `☠️ [Nuvia the Wicked] Invocada de Modo Normal: Se destruye a sí misma automáticamente.`, 'monster');
            }
            return { success: true };
        },

    calculateStatModifiers(monster, duelState, playerKey) {
            const oppKey = playerKey === 'player1' ? 'player2' : 'player1';
            const oppCount = (duelState[oppKey]?.monsters || []).filter(m => m).length;
            return { atkMod: -(oppCount * 200), defMod: 0 };
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
