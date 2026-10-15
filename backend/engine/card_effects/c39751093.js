/**
 * [Passcode: 39751093] Otohime
 * Tipo: Spirit Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 39751093,
    name: "Otohime",
    type: "Spirit Effect Monster",
    atk: 0,
    def: 100,
    level: 3,
    race: "Spellcaster",
    attribute: "LIGHT",
    isSpirit: true,
    cannotSpecialSummon: true,

    canActivate() { return { canActivate: true }; },

    async onSummonOrFlip(context) {
            const { duelState, opponentKey, effectUtils } = context;
            const opp = duelState[opponentKey];
            const targetMon = (opp.monsters || []).find(m => m);
            if (targetMon) {
                targetMon.position = targetMon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `👸✨ [Otohime] Cambia la posición de batalla de "${targetMon.name || targetMon.card_data?.name}".`, 'monster');
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSummonOrFlip({ duelState, opponentKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
