/**
 * [Passcode: 31553716] Spear Dragon
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 31553716,
    name: "Spear Dragon",
    type: "Effect Monster",
    atk: 1900,
    def: 0,
    level: 4,
    race: "Dragon",
    attribute: "WIND",
    hasPiercing: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo pasivo de combate." }; },

    async onAfterAttack(context) {
            const { duelState, playerKey, slotIndex, effectUtils } = context;
            const p = duelState[playerKey];
            const mon = p?.monsters?.[slotIndex];
            if (mon && mon.position.includes('attack')) {
                mon.position = 'face-up-defense';
                effectUtils.emitDuelLog(duelState.roomId, `🐉🛡️ [Spear Dragon] Tras atacar con daño de penetración, cambia automáticamente a Posición de Defensa.`, 'monster');
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
