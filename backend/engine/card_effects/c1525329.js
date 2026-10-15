/**
 * [Passcode: 1525329] The Hunter with 7 Weapons
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 1525329,
    name: "The Hunter with 7 Weapons",
    type: "Effect Monster",
    atk: 1000,
    def: 600,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",

    canActivate() { return { canActivate: true }; },

    async onNormalSummon(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.declaredHunterType = 'Dragon';
                mon.currentAtk = (mon.currentAtk || 1000) + 1000;
                effectUtils.emitDuelLog(duelState.roomId, `🏹⚔️ [The Hunter with 7 Weapons] Declara Tipo (Dragon) y gana +1000 ATK contra monstruos de ese Tipo (ATK: ${mon.currentAtk}).`, 'monster');
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
