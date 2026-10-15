/**
 * [Passcode: 44656491] Messenger of Peace
 * Tipo: Continuous Spell | Expansión: MRL
 */
module.exports = {
    id: 44656491,
    name: "Messenger of Peace",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    isMessengerOfPeace: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🕊️✨ [${this.name}] ¡Mensajero de la Paz activo! Ningún monstruo con 1500 o más ATK puede declarar un ataque.`, 'spell');
        return { success: true };
    },

    async onStandby(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        if (p) {
            if (p.lp > 100) {
                p.lp -= 100;
                effectUtils.emitDuelLog(duelState.roomId, `🕊️ [${this.name}] Paga 100 LP de mantenimiento. (LP: ${p.lp})`, 'cost');
            }
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
