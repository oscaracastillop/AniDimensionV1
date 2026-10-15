/**
 * [Passcode: 42647539] Ryu-Kishin Clown
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 42647539,
    name: "Ryu-Kishin Clown",
    type: "Effect Monster",
    atk: 800,
    def: 500,
    level: 2,
    race: "Fiend",
    attribute: "DARK",

    canActivate() { return { canActivate: false, reason: "Efecto de invocación/volteo." }; },

    async onSummonOrFlip(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon) {
                mon.position = mon.position.includes('attack') ? 'face-up-defense' : 'face-up-attack';
                effectUtils.emitDuelLog(duelState.roomId, `🤡 [Ryu-Kishin Clown] Cambia su posición de batalla inmediatamente.`, 'monster');
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
