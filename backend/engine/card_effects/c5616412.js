/**
 * [Passcode: 5616412] Destruction Punch
 * Tipo: Normal Trap | Expansión: LON
 */
module.exports = {
    id: 5616412,
    name: "Destruction Punch",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🥊💥 [Destruction Punch] ¡Golpe de Destrucción activado en combate! Si el ATK del atacante es menor que la DEF del objetivo, el atacante es destruido.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
