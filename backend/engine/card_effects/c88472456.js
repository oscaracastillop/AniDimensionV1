/**
 * [Passcode: 88472456] Zombyra the Dark
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 88472456,
    name: "Zombyra the Dark",
    type: "Effect Monster",
    atk: 2100,
    def: 500,
    level: 4,
    race: "Warrior",
    attribute: "DARK",
    cannotAttackDirectly: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo y disparado por combate." }; },

    async onMonsterDestroyedByBattle(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.currentAtk = (mon.currentAtk !== undefined ? mon.currentAtk : 2100) - 200;
                effectUtils.emitDuelLog(duelState.roomId, `⚔️💀 [Zombyra the Dark] Destruyó un monstruo en batalla: Pierde 200 ATK (ATK actual: ${mon.currentAtk}). No puede atacar directamente.`, 'monster');
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
